import { createClient } from '@supabase/supabase-js';
import { error, fail } from '@sveltejs/kit';
import Polar from 'stripe';
import type { Actions, PageServerLoad } from './$types';
import { env } from '$lib/env';
import { classifyChurnSignal, type AIClassification } from '$lib/server/ai-classifier';
import { sendSequenceEmail } from '$lib/server/email-sender';
import { resolveOrganization as resolveStoredOrganization } from '$lib/server/organizations';
import type { ChurnSignal, SequenceEmail, SignalStatus, SignalType } from '$lib/types';
import type { Database, ChurnSignalRow, OrganizationRow, SequenceEmailRow } from '$lib/types/supabase';

type CustomerContext = {
	name: string | null;
	email: string | null;
	customerSince: string | null;
	stripeUrl: string | null;
};

const admin = createClient<Database, 'public'>(env.supabaseUrl, env.supabaseServiceRoleKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false
	}
});

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

function toSignalType(value: string): SignalType {
	return signalTypes.includes(value as SignalType) ? (value as SignalType) : 'disengaged';
}

function toSignalStatus(value: string): SignalStatus {
	return signalStatuses.includes(value as SignalStatus) ? (value as SignalStatus) : 'detected';
}

function toSignal(row: ChurnSignalRow): ChurnSignal {
	return {
		...row,
		provider: (row.provider as ChurnSignal['provider']) ?? 'polar',
		signal_type: toSignalType(row.signal_type),
		status: toSignalStatus(row.status),
		metadata: row.metadata
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
			'Lead with the exact risk signal so the message feels timely.',
			'Make the next action concrete, simple, and low-friction.',
			'Connect the email to the customer outcome they still care about.'
		]
	};
}

function computeRiskScore(signal: ChurnSignal): number {
	const baseScore: Record<SignalType, number> = {
		card_failed: 48,
		disengaged: 32,
		downgraded: 56,
		paused: 38,
		cancelled: 72,
		high_mrr_risk: 82,
		trial_ending: 64
	};
	const mrrContribution = Math.min(18, Math.round(signal.mrr_amount / 5_000));
	const highValueBonus = signal.mrr_amount > 50_000 ? 12 : 0;

	return Math.min(100, baseScore[signal.signal_type] + mrrContribution + highValueBonus);
}

async function resolveOrganization(userId: string | undefined): Promise<OrganizationRow | null> {
	return resolveStoredOrganization(userId);
}

async function loadSignal(signalId: string, orgId: string): Promise<ChurnSignal | null> {
	const { data, error } = await admin
		.from('churn_signals')
		.select('*')
		.eq('id', signalId)
		.eq('org_id', orgId)
		.maybeSingle();

	if (error) {
		throw error;
	}

	return data ? toSignal(data as unknown as ChurnSignalRow) : null;
}

async function loadEmails(signalId: string, orgId: string): Promise<SequenceEmail[]> {
	const { data, error } = await admin
		.from('sequence_emails')
		.select('*')
		.eq('signal_id', signalId)
		.eq('org_id', orgId)
		.order('step', { ascending: true });

	if (error) {
		throw error;
	}

	return ((data ?? []) as unknown as SequenceEmailRow[]).map((row) => ({ ...row }));
}

async function loadCustomerContext(
	org: OrganizationRow,
	signal: ChurnSignal
): Promise<CustomerContext> {
	if (!signal.polar_customer_id) {
		return {
			name: signal.customer_name,
			email: signal.customer_email,
			customerSince: null,
			stripeUrl: null
		};
	}

	try {
		if (org.polar_access_token) {
			const stripe = new Polar(org.polar_access_token);
			const customer = await stripe.customers.retrieve(signal.polar_customer_id);

			if (!customer.deleted) {
				const customerSince =
					typeof customer.metadata?.customer_since === 'string' && customer.metadata.customer_since.trim()
						? customer.metadata.customer_since
						: new Date(customer.created * 1000).toISOString();

				return {
					name: customer.name ?? signal.customer_name,
					email: customer.email ?? signal.customer_email,
					customerSince,
					stripeUrl: `https://dashboard.stripe.com/customers/${signal.polar_customer_id}`
				};
			}
		}
	} catch {
		// fall back to stored customer context
	}

	return {
		name: signal.customer_name,
		email: signal.customer_email,
		customerSince: null,
		stripeUrl: `https://dashboard.stripe.com/customers/${signal.polar_customer_id}`
	};
}

async function ensureClassification(signal: ChurnSignal): Promise<AIClassification> {
	if (signal.ai_churn_reason && signal.ai_win_back_angle) {
		return fallbackClassification(signal);
	}

	const classification = await classifyChurnSignal(signal);
	const { error: updateError } = await admin
		.from('churn_signals')
		.update({
			ai_churn_reason: classification.churn_reason,
			ai_win_back_angle: classification.win_back_angle
		} as never)
		.eq('id', signal.id);

	if (updateError) {
		throw updateError;
	}

	return classification;
}

async function updateSignalStatus(
	signalId: string,
	orgId: string,
	status: SignalStatus
): Promise<void> {
	const { error: updateError } = await admin
		.from('churn_signals')
		.update({
			status,
			resolved_at: status === 'recovered' || status === 'dismissed' ? new Date().toISOString() : null
		} as never)
		.eq('id', signalId)
		.eq('org_id', orgId);

	if (updateError) {
		throw updateError;
	}
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const organization = await resolveOrganization(locals.session?.userId);

	if (!organization) {
		throw error(404, 'Workspace not found');
	}

	const signal = await loadSignal(params.id, organization.id);

	if (!signal) {
		throw error(404, 'Signal not found');
	}

	const [emails, classification, customerContext] = await Promise.all([
		loadEmails(signal.id, organization.id),
		ensureClassification(signal),
		loadCustomerContext(organization, signal)
	]);

	return {
		title: 'Signal Detail',
		breadcrumb: ['ChurnPulse', 'Signals', signal.customer_name ?? 'Signal detail'],
		signal,
		emails,
		classification,
		customerContext,
		riskScore: computeRiskScore(signal)
	};
};

export const actions: Actions = {
	markRecovered: async ({ locals, params }) => {
		const organization = await resolveOrganization(locals.session?.userId);

		if (!organization) {
			return fail(404, { message: 'Workspace not found.' });
		}

		await updateSignalStatus(params.id, organization.id, 'recovered');
		return { message: 'Signal marked as recovered.' };
	},

	dismissSignal: async ({ locals, params }) => {
		const organization = await resolveOrganization(locals.session?.userId);

		if (!organization) {
			return fail(404, { message: 'Workspace not found.' });
		}

		await updateSignalStatus(params.id, organization.id, 'dismissed');
		return { message: 'Signal dismissed.' };
	},

	stopSequence: async ({ locals, params }) => {
		const organization = await resolveOrganization(locals.session?.userId);

		if (!organization) {
			return fail(404, { message: 'Workspace not found.' });
		}

		const { error: updateError } = await admin
			.from('sequence_emails')
			.update({
				status: 'dismissed'
			} as never)
			.eq('signal_id', params.id)
			.eq('org_id', organization.id)
			.eq('status', 'pending');

		if (updateError) {
			return fail(500, { message: 'Pending sequence steps could not be stopped.' });
		}

		return { message: 'Pending sequence steps stopped.' };
	},

	sendNow: async ({ locals, request, params }) => {
		const organization = await resolveOrganization(locals.session?.userId);
		const formData = await request.formData();
		const emailId = formData.get('emailId');

		if (!organization) {
			return fail(404, { message: 'Workspace not found.' });
		}

		let targetEmailId: string | null = typeof emailId === 'string' ? emailId : null;

		if (!targetEmailId) {
			const { data, error: queryError } = await admin
				.from('sequence_emails')
				.select('id, step')
				.eq('signal_id', params.id)
				.eq('org_id', organization.id)
				.eq('status', 'pending')
				.order('step', { ascending: true })
				.limit(1)
				.maybeSingle();

			if (queryError) {
				return fail(500, { message: 'Pending sequence steps could not be loaded.' });
			}

			targetEmailId = (data as unknown as Pick<SequenceEmailRow, 'id'> | null)?.id ?? null;
		}

		if (!targetEmailId) {
			return fail(400, { message: 'No pending email is available for this signal.' });
		}

		await sendSequenceEmail(targetEmailId);
		return { message: 'Sequence email sent immediately.' };
	},

	runAiAnalysis: async ({ locals, params }) => {
		const organization = await resolveOrganization(locals.session?.userId);

		if (!organization) {
			return fail(404, { message: 'Workspace not found.' });
		}

		const signal = await loadSignal(params.id, organization.id);

		if (!signal) {
			return fail(404, { message: 'Signal not found.' });
		}

		const classification = await classifyChurnSignal(signal);
		const { error: updateError } = await admin
			.from('churn_signals')
			.update({
				ai_churn_reason: classification.churn_reason,
				ai_win_back_angle: classification.win_back_angle
			} as never)
			.eq('id', signal.id)
			.eq('org_id', organization.id);

		if (updateError) {
			return fail(500, { message: 'AI analysis could not be refreshed.' });
		}

		return { message: 'AI analysis refreshed.' };
	}
};
