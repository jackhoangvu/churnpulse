import { createClient } from '@supabase/supabase-js';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { env } from '$lib/env';
import type { AIClassification } from '$lib/server/ai-classifier';
import { sendSequenceEmail } from '$lib/server/email-sender';
import { generateEmailContent } from '$lib/server/email-templates';
import { resolveOrganization as resolveStoredOrganization } from '$lib/server/organizations';
import { SIGNAL_CONFIGS, type ChurnSignal, type SequenceEmail, type SignalType } from '$lib/types';
import type { Database, ChurnSignalRow, OrganizationRow, SequenceEmailRow } from '$lib/types/supabase';

type SequenceStatusFilter = 'pending' | 'sent' | 'failed';

type SequenceRow = {
	id: string;
	signal_id: string;
	org_id: string;
	email_to: string;
	subject: string | null;
	body: string | null;
	step: number;
	status: string;
	scheduled_for: string | null;
	sent_at: string | null;
	created_at: string;
	customer_name: string | null;
	customer_email: string | null;
	signal_type: SignalType;
	signal_status: ChurnSignal['status'];
	subject_preview: string;
};

type SequenceGroup = {
	signal_id: string;
	signal_type: SignalType;
	customer_name: string | null;
	customer_email: string | null;
	emails: SequenceEmail[];
};

const admin = createClient<Database, 'public'>(env.supabaseUrl, env.supabaseServiceRoleKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false
	}
});

function startOfDay(date: Date): Date {
	const clone = new Date(date);
	clone.setHours(0, 0, 0, 0);
	return clone;
}

function endOfDay(date: Date): Date {
	const clone = new Date(date);
	clone.setHours(23, 59, 59, 999);
	return clone;
}

function startOfWeek(date: Date): Date {
	const clone = startOfDay(date);
	const day = clone.getDay();
	const offset = day === 0 ? 6 : day - 1;
	clone.setDate(clone.getDate() - offset);
	return clone;
}

function endOfWeek(date: Date): Date {
	const clone = endOfDay(startOfWeek(date));
	clone.setDate(clone.getDate() + 6);
	return clone;
}

function normalizeSignalType(value: string): SignalType {
	return value in SIGNAL_CONFIGS ? (value as SignalType) : 'disengaged';
}

function normalizeSignalStatus(value: string): ChurnSignal['status'] {
	if (
		value === 'detected' ||
		value === 'sequence_started' ||
		value === 'recovered' ||
		value === 'churned' ||
		value === 'dismissed'
	) {
		return value;
	}

	return 'detected';
}

function toSignal(row: ChurnSignalRow): ChurnSignal {
	return {
		...row,
		signal_type: normalizeSignalType(row.signal_type),
		status: normalizeSignalStatus(row.status),
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
			'Reference the specific signal immediately.',
			'Make the next action clear and low-friction.',
			'Connect the email to an outcome the customer still cares about.'
		]
	};
}

function getEffectiveTimestamp(row: SequenceEmailRow): string {
	return row.scheduled_for ?? row.sent_at ?? row.created_at;
}

function isWithinRange(
	row: SequenceEmailRow,
	fromDate: Date | null,
	toDate: Date | null
): boolean {
	const effective = new Date(getEffectiveTimestamp(row));

	if (fromDate && effective < startOfDay(fromDate)) {
		return false;
	}

	if (toDate && effective > endOfDay(toDate)) {
		return false;
	}

	return true;
}

function buildSubjectPreview(
	email: SequenceEmailRow,
	signal: ChurnSignal,
	orgName: string
): string {
	if (email.subject?.trim()) {
		return email.subject.trim();
	}

	return generateEmailContent({
		signal,
		step: email.step,
		classification: fallbackClassification(signal),
		org_name: orgName
	}).subject;
}

async function resolveOrganization(userId: string | undefined): Promise<OrganizationRow | null> {
	if (userId) {
		const organization = await resolveStoredOrganization(userId);
		if (organization) {
			return organization;
		}
	}

	const { data } = await admin
		.from('organizations')
		.select('*')
		.order('created_at', { ascending: true })
		.limit(1)
		.maybeSingle();

	return data as unknown as OrganizationRow | null;
}

async function loadOrgEmails(orgId: string): Promise<SequenceEmailRow[]> {
	const { data, error } = await admin
		.from('sequence_emails')
		.select('*')
		.eq('org_id', orgId)
		.order('scheduled_for', { ascending: true, nullsFirst: false });

	if (error) {
		console.error({
			job: 'sequences-page-load',
			error: error.message,
			signal_id: null
		});

		return [];
	}

	return (data ?? []) as unknown as SequenceEmailRow[];
}

async function loadSignals(signalIds: string[]): Promise<ChurnSignalRow[]> {
	if (signalIds.length === 0) {
		return [];
	}

	const { data, error } = await admin
		.from('churn_signals')
		.select('*')
		.in('id', signalIds);

	if (error) {
		console.error({
			job: 'sequences-page-load',
			error: error.message,
			signal_id: null
		});

		return [];
	}

	return (data ?? []) as unknown as ChurnSignalRow[];
}

function buildSequenceRows(
	emailRows: SequenceEmailRow[],
	signals: ChurnSignalRow[],
	orgName: string
): SequenceRow[] {
	const signalMap = new Map(signals.map((signal) => [signal.id, toSignal(signal)]));

	return emailRows
		.map((email) => {
			const signal = signalMap.get(email.signal_id);

			if (!signal) {
				return null;
			}

			return {
				...email,
				customer_name: signal.customer_name,
				customer_email: signal.customer_email,
				signal_type: signal.signal_type,
				signal_status: signal.status,
				subject_preview: buildSubjectPreview(email, signal, orgName)
			};
		})
		.filter((row): row is SequenceRow => row !== null);
}

function groupEmailsBySignal(rows: SequenceRow[]): SequenceGroup[] {
	const groups = new Map<string, SequenceGroup>();

	for (const row of rows) {
		const current = groups.get(row.signal_id);
		const email: SequenceEmail = {
			id: row.id,
			signal_id: row.signal_id,
			org_id: row.org_id,
			email_to: row.email_to,
			subject: row.subject,
			body: row.body,
			step: row.step,
			status: row.status,
			scheduled_for: row.scheduled_for,
			sent_at: row.sent_at,
			created_at: row.created_at
		};

		if (current) {
			current.emails.push(email);
			continue;
		}

		groups.set(row.signal_id, {
			signal_id: row.signal_id,
			signal_type: row.signal_type,
			customer_name: row.customer_name,
			customer_email: row.customer_email,
			emails: [email]
		});
	}

	return [...groups.values()].map((group) => ({
		...group,
		emails: [...group.emails].sort((left, right) => left.step - right.step)
	}));
}

function applyFilters(
	rows: SequenceRow[],
	params: URLSearchParams
): {
	filteredRows: SequenceRow[];
	status: SequenceStatusFilter;
	signalType: SignalType | 'all';
	from: string;
	to: string;
} {
	const statusParam = params.get('status');
	const signalTypeParam = params.get('signal_type');
	const from = params.get('from') ?? '';
	const to = params.get('to') ?? '';
	const fromDate = from ? new Date(from) : null;
	const toDate = to ? new Date(to) : null;

	const status: SequenceStatusFilter =
		statusParam === 'sent' || statusParam === 'failed' ? statusParam : 'pending';
	const signalType: SignalType | 'all' =
		signalTypeParam && signalTypeParam in SIGNAL_CONFIGS
			? (signalTypeParam as SignalType)
			: 'all';

	const filteredRows = rows.filter((row) => {
		if (signalType !== 'all' && row.signal_type !== signalType) {
			return false;
		}

		if (!isWithinRange(row, fromDate, toDate)) {
			return false;
		}

		return true;
	});

	return { filteredRows, status, signalType, from, to };
}

async function loadRowForAction(emailRowId: string, orgId: string): Promise<SequenceEmailRow | null> {
	const { data, error } = await admin
		.from('sequence_emails')
		.select('*')
		.eq('id', emailRowId)
		.eq('org_id', orgId)
		.maybeSingle();

	if (error) {
		console.error({
			job: 'sequences-page-action',
			error: error.message,
			signal_id: null
		});
		return null;
	}

	return data as unknown as SequenceEmailRow | null;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const organization = await resolveOrganization(locals.session?.userId);
	const now = new Date();

	if (!organization) {
		return {
			title: 'Sequences',
			breadcrumb: ['ChurnPulse', 'Sequences'],
			nowIso: now.toISOString(),
			orgName: 'No workspace connected',
			stats: {
				sentToday: 0,
				sentThisWeek: 0,
				scheduledThisWeek: 0,
				totalPending: 0,
				failed: 0,
				successRate: 0
			},
			filters: {
				status: 'pending' as SequenceStatusFilter,
				signalType: 'all' as SignalType | 'all',
				from: '',
				to: ''
			},
			rows: {
				upcoming: [] as SequenceRow[],
				sent: [] as SequenceRow[],
				failed: [] as SequenceRow[]
			},
			tabCounts: {
				upcoming: 0,
				sent: 0,
				failed: 0
			},
			groups: [] as SequenceGroup[],
			filterOptions: Object.keys(SIGNAL_CONFIGS) as SignalType[]
		};
	}

	const emailRows = await loadOrgEmails(organization.id);
	const signalRows = await loadSignals([...new Set(emailRows.map((row) => row.signal_id))]);
	const joinedRows = buildSequenceRows(emailRows, signalRows, organization.name ?? 'Your team');
	const { filteredRows, status, signalType, from, to } = applyFilters(joinedRows, url.searchParams);

	const dayStart = startOfDay(now);
	const weekStart = startOfWeek(now);
	const weekEnd = endOfWeek(now);

	const sentRows = joinedRows.filter((row) => row.status === 'sent');
	const sentToday = sentRows.filter((row) => {
		if (!row.sent_at) {
			return false;
		}

		const sentAt = new Date(row.sent_at);
		return sentAt >= dayStart && sentAt <= endOfDay(now);
	}).length;

	const sentThisWeek = sentRows.filter((row) => {
		if (!row.sent_at) {
			return false;
		}

		const sentAt = new Date(row.sent_at);
		return sentAt >= weekStart && sentAt <= weekEnd;
	}).length;

	const scheduledThisWeek = joinedRows.filter((row) => {
		if (row.status !== 'pending' || !row.scheduled_for) {
			return false;
		}

		const scheduledAt = new Date(row.scheduled_for);
		return scheduledAt >= weekStart && scheduledAt <= weekEnd;
	}).length;

	const totalPending = joinedRows.filter((row) => row.status === 'pending').length;
	const failed = joinedRows.filter((row) => row.status === 'failed').length;
	const total = joinedRows.length;
	const successRate = total > 0 ? Math.round((sentRows.length / total) * 100) : 0;

	return {
		title: 'Sequences',
		breadcrumb: ['ChurnPulse', 'Sequences'],
		nowIso: now.toISOString(),
		orgName: organization.name ?? 'Your team',
		stats: {
			sentToday,
			sentThisWeek,
			scheduledThisWeek,
			totalPending,
			failed,
			successRate
		},
		filters: {
			status,
			signalType,
			from,
			to
		},
		rows: {
			upcoming: filteredRows
				.filter((row) => row.status === 'pending')
				.sort(
					(left, right) =>
						new Date(left.scheduled_for ?? left.created_at).getTime() -
						new Date(right.scheduled_for ?? right.created_at).getTime()
				),
			sent: filteredRows
				.filter((row) => row.status === 'sent')
				.sort(
					(left, right) =>
						new Date(right.sent_at ?? right.created_at).getTime() -
						new Date(left.sent_at ?? left.created_at).getTime()
				),
			failed: filteredRows
				.filter((row) => row.status === 'failed')
				.sort(
					(left, right) =>
						new Date(left.scheduled_for ?? left.created_at).getTime() -
						new Date(right.scheduled_for ?? right.created_at).getTime()
				)
		},
		tabCounts: {
			upcoming: filteredRows.filter((row) => row.status === 'pending').length,
			sent: filteredRows.filter((row) => row.status === 'sent').length,
			failed: filteredRows.filter((row) => row.status === 'failed').length
		},
		groups: groupEmailsBySignal(filteredRows),
		filterOptions: Object.keys(SIGNAL_CONFIGS) as SignalType[]
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const formData = await request.formData();
		const intent = formData.get('intent');
		const emailRowId = formData.get('emailRowId');

		if (typeof intent !== 'string' || typeof emailRowId !== 'string') {
			return fail(400, { message: 'The requested sequence action could not be processed.' });
		}

		const organization = await resolveOrganization(locals.session?.userId);

		if (!organization) {
			return fail(404, { message: 'No connected workspace was found for this account.' });
		}

		const emailRow = await loadRowForAction(emailRowId, organization.id);

		if (!emailRow) {
			return fail(404, { message: 'That sequence email could not be found in this workspace.' });
		}

		if (intent === 'send_now') {
			await sendSequenceEmail(emailRow.id);
			return { message: 'Sequence email sent immediately.' };
		}

		if (intent === 'cancel') {
			const { error } = await admin.from('sequence_emails').delete().eq('id', emailRow.id);

			if (error) {
				console.error({
					job: 'sequences-page-action',
					error: error.message,
					signal_id: emailRow.signal_id
				});
				return fail(500, { message: 'We could not cancel that scheduled email.' });
			}

			return { message: 'Scheduled email cancelled.' };
		}

		if (intent === 'retry') {
			const { error } = await admin
				.from('sequence_emails')
				.update({
					status: 'pending',
					scheduled_for: new Date().toISOString(),
					sent_at: null
				} as never)
				.eq('id', emailRow.id);

			if (error) {
				console.error({
					job: 'sequences-page-action',
					error: error.message,
					signal_id: emailRow.signal_id
				});
				return fail(500, { message: 'We could not queue that failed email for retry.' });
			}

			await sendSequenceEmail(emailRow.id);
			return { message: 'Failed email retried.' };
		}

		return fail(400, { message: 'That sequence action is not supported.' });
	}
};
