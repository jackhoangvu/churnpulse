import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import Polar from 'stripe';
import { env } from '$lib/env';
import { classifyChurnSignal, type AIClassification } from '$lib/server/ai-classifier';
import { generateEmailContent } from '$lib/server/email-templates';
import { logEmailSent, logError, log } from '$lib/server/logger';
import type { ChurnSignal, SignalStatus, SignalType } from '$lib/types';
import type { Database, ChurnSignalRow, OrganizationRow, SequenceEmailRow } from '$lib/types/supabase';

const admin = createClient<Database, 'public'>(env.supabaseUrl, env.supabaseServiceRoleKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false
	}
});

const resend = new Resend(env.resendApiKey);

const signalTypes: SignalType[] = [
	'card_failed',
	'disengaged',
	'downgraded',
	'paused',
	'cancelled',
	'high_mrr_risk',
	'trial_ending'
];

const signalStatuses: SignalStatus[] = [
	'detected',
	'sequence_started',
	'recovered',
	'churned',
	'dismissed'
];

function serializeError(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	return String(error);
}

function isSignalType(value: string): value is SignalType {
	return signalTypes.includes(value as SignalType);
}

function isSignalStatus(value: string): value is SignalStatus {
	return signalStatuses.includes(value as SignalStatus);
}

function toTypedSignal(signal: ChurnSignalRow): ChurnSignal {
	return {
		...signal,
		provider: (signal.provider as ChurnSignal['provider']) ?? 'polar',
		signal_type: isSignalType(signal.signal_type) ? signal.signal_type : 'disengaged',
		status: isSignalStatus(signal.status) ? signal.status : 'detected',
		metadata: signal.metadata
	};
}

function fallbackClassification(signal: ChurnSignal): AIClassification {
	return {
		churn_reason:
			signal.ai_churn_reason ??
			'The customer is showing a meaningful retention risk signal and likely needs a timely, relevant follow-up.',
		win_back_angle:
			signal.ai_win_back_angle ??
			'Lead with the specific issue, reduce friction, and give the customer a simple next step back into value.',
		urgency_score:
			signal.signal_type === 'high_mrr_risk' ? 10 : signal.signal_type === 'card_failed' ? 9 : 6,
		recommended_tone:
			signal.signal_type === 'high_mrr_risk'
				? 'urgent'
				: signal.signal_type === 'downgraded'
					? 'value_focused'
					: signal.signal_type === 'cancelled'
						? 'gentle'
						: 'empathetic',
		key_talking_points: [
			'Reference the specific signal immediately.',
			'Make the next action clear and low-friction.',
			'Connect the email to an outcome the customer still cares about.'
		]
	};
}

function getFromAddress(): string {
	return env.nodeEnv === 'development'
		? 'ChurnPulse <onboarding@resend.dev>'
		: 'ChurnPulse <noreply@churnpulse.io>';
}

function getPolarClient(apiKey: string): Polar {
	return new Polar(apiKey);
}

async function getBillingPortalUrl(
	signal: ChurnSignal,
	org: OrganizationRow
): Promise<string | undefined> {
	if (!signal.polar_customer_id) {
		return undefined;
	}

	try {
		if (org.polar_access_token) {
			const stripe = getPolarClient(org.polar_access_token);
			const session = await stripe.billingPortal.sessions.create({
				customer: signal.polar_customer_id,
				return_url: `${env.publicAppUrl}/dashboard`
			});

			return session.url;
		}

		if (org.polar_account_id) {
			const stripe = getPolarClient(env.stripeSecretKey);
			const session = await stripe.billingPortal.sessions.create(
				{
					customer: signal.polar_customer_id,
					return_url: `${env.publicAppUrl}/dashboard`
				},
				{
					stripeAccount: org.polar_account_id
				}
			);

			return session.url;
		}
	} catch (error) {
		logError('send-sequence-email', error, { signal_id: signal.id });
	}

	return undefined;
}

async function updateEmailStatus(
	emailRowId: string,
	update: Database['public']['Tables']['sequence_emails']['Update'],
	signalId: string | null
): Promise<void> {
	const { error } = await admin
		.from('sequence_emails')
		.update(update as never)
		.eq('id', emailRowId);

	if (error) {
		log('error', 'send-sequence-email', 'Failed to update email status', {
			error: error.message,
			signal_id: signalId
		});
	}
}

async function loadSequenceContext(emailRowId: string): Promise<{
	emailRow: SequenceEmailRow | null;
	signal: ChurnSignal | null;
	org: OrganizationRow | null;
}> {
	const { data: emailRow, error: emailError } = await admin
		.from('sequence_emails')
		.select('*')
		.eq('id', emailRowId)
		.maybeSingle();
	const typedEmailRow = emailRow as unknown as SequenceEmailRow | null;

	if (emailError || !typedEmailRow) {
		log('error', 'send-sequence-email', 'Sequence email row not found', {
			error: emailError?.message ?? 'Sequence email row not found',
			signal_id: null
		});

		return { emailRow: null, signal: null, org: null };
	}

	const [{ data: signalRow, error: signalError }, { data: org, error: orgError }] =
		await Promise.all([
			admin.from('churn_signals').select('*').eq('id', typedEmailRow.signal_id).maybeSingle(),
			admin.from('organizations').select('*').eq('id', typedEmailRow.org_id).maybeSingle()
		]);
	const typedSignalRow = signalRow as unknown as ChurnSignalRow | null;
	const typedOrg = org as unknown as OrganizationRow | null;

	if (signalError || !typedSignalRow || orgError || !typedOrg) {
		log('error', 'send-sequence-email', 'Missing signal or organization', {
			error: signalError?.message ?? orgError?.message ?? 'Missing signal or organization',
			signal_id: typedEmailRow.signal_id
		});

		return { emailRow: typedEmailRow, signal: null, org: null };
	}

	return { emailRow: typedEmailRow, signal: toTypedSignal(typedSignalRow), org: typedOrg };
}

async function resolveClassification(signal: ChurnSignal): Promise<AIClassification> {
	if (signal.ai_churn_reason && signal.ai_win_back_angle) {
		return fallbackClassification(signal);
	}

	const classification = await classifyChurnSignal(signal);
	const { error } = await admin
		.from('churn_signals')
		.update({
			ai_churn_reason: classification.churn_reason,
			ai_win_back_angle: classification.win_back_angle
		} as never)
		.eq('id', signal.id);

	if (error) {
		log('error', 'send-sequence-email', 'Failed to save AI classification', {
			error: error.message,
			signal_id: signal.id
		});
	}

	return classification;
}

export async function sendSequenceEmail(emailRowId: string): Promise<void> {
	let signalId: string | null = null;

	try {
		const { emailRow, signal, org } = await loadSequenceContext(emailRowId);

		if (!emailRow || !signal || !org) {
			if (emailRow) {
				await updateEmailStatus(emailRow.id, { status: 'failed' }, emailRow.signal_id);
			}

			return;
		}

		signalId = signal.id;

		if (!signal.customer_email) {
			await updateEmailStatus(emailRow.id, { status: 'failed' }, signal.id);
			console.error({
				job: 'send-sequence-email',
				error: 'Signal has no customer_email',
				signal_id: signal.id
			});
			return;
		}

		const classification = await resolveClassification(signal);
		const updateCardUrl = await getBillingPortalUrl(signal, org);
		const content = generateEmailContent({
			signal,
			step: emailRow.step,
			classification,
			org_name: org.name ?? 'Your team',
			update_card_url: updateCardUrl
		});

		const response = await resend.emails.send({
			from: getFromAddress(),
			to: signal.customer_email,
			subject: content.subject,
			html: content.html,
			text: content.text
		});

		if (response.error) {
			throw new Error(response.error.message);
		}

			await updateEmailStatus(
			emailRow.id,
			{
				status: 'sent',
				sent_at: new Date().toISOString(),
				subject: content.subject,
				body: content.html
			},
			signal.id
		);
		logEmailSent(
			{
				...emailRow,
				status: 'sent',
				subject: content.subject,
				body: content.html,
				sent_at: new Date().toISOString()
			},
			signal.id
		);

		if (signal.status !== 'sequence_started') {
			const { error } = await admin
				.from('churn_signals')
				.update({
					status: 'sequence_started'
				} as never)
				.eq('id', signal.id);

			if (error) {
				log('error', 'send-sequence-email', 'Failed to mark signal as sequence_started', {
					error: error.message,
					signal_id: signal.id
				});
			}
		}
	} catch (error) {
		await updateEmailStatus(
			emailRowId,
			{
				status: 'failed'
			},
			signalId
		);

		logError('send-sequence-email', error, { signal_id: signalId });
	}
}
