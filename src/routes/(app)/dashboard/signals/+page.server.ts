import { createClient } from '@supabase/supabase-js';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { env } from '$lib/env';
import { sendSequenceEmail } from '$lib/server/email-sender';
import { resolveOrganization as resolveStoredOrganization } from '$lib/server/organizations';
import { scheduleSequence } from '$lib/server/sequences';
import type { ChurnSignal, SequenceEmail, SignalStatus, SignalType } from '$lib/types';
import type { Database, ChurnSignalRow, OrganizationRow, SequenceEmailRow } from '$lib/types/supabase';

type SortKey = 'mrr_desc' | 'mrr_asc' | 'date_desc' | 'date_asc';
type StatusFilter = SignalStatus | 'all';
type SignalFilter = SignalType | 'all';
type PerPage = 10 | 25 | 50;

type SequenceSummary = {
	hasSequence: boolean;
	totalSteps: number;
	currentStep: number | null;
	nextPendingEmailId: string | null;
};

type SignalListItem = ChurnSignal & {
	is_high_value: boolean;
	sequence: SequenceSummary;
};

const admin = createClient<Database, 'public'>(env.supabaseUrl, env.supabaseServiceRoleKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false
	}
});

const DEFAULT_PER_PAGE: PerPage = 25;
const signalTypes: SignalType[] = [
	'card_failed',
	'disengaged',
	'downgraded',
	'paused',
	'cancelled',
	'high_mrr_risk'
];
const signalStatuses: SignalStatus[] = [
	'detected',
	'sequence_started',
	'recovered',
	'churned',
	'dismissed'
];
const sequenceLengths: Record<SignalType, number> = {
	card_failed: 3,
	disengaged: 3,
	downgraded: 2,
	paused: 3,
	cancelled: 3,
	high_mrr_risk: 1
};

function toSignalType(value: string): SignalType {
	return signalTypes.includes(value as SignalType) ? (value as SignalType) : 'disengaged';
}

function toSignalStatus(value: string): SignalStatus {
	return signalStatuses.includes(value as SignalStatus) ? (value as SignalStatus) : 'detected';
}

function toSignal(row: ChurnSignalRow): ChurnSignal {
	return {
		...row,
		signal_type: toSignalType(row.signal_type),
		status: toSignalStatus(row.status),
		metadata: row.metadata
	};
}

function parsePage(value: string | null): number {
	const parsed = Number(value ?? '1');
	return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

function parsePerPage(value: string | null): PerPage {
	return value === '10' || value === '50' ? Number(value) as PerPage : DEFAULT_PER_PAGE;
}

function parseSignalFilter(value: string | null): SignalFilter {
	return value && signalTypes.includes(value as SignalType) ? (value as SignalType) : 'all';
}

function parseStatusFilter(value: string | null): StatusFilter {
	return value && signalStatuses.includes(value as SignalStatus) ? (value as SignalStatus) : 'all';
}

function parseSort(value: string | null): SortKey {
	if (value === 'mrr_desc' || value === 'mrr_asc' || value === 'date_asc') {
		return value;
	}

	return 'date_desc';
}

async function resolveOrganization(userId: string | undefined): Promise<OrganizationRow | null> {
	return resolveStoredOrganization(userId);
}

async function loadSequencesForSignals(signalIds: string[]): Promise<SequenceEmail[]> {
	if (signalIds.length === 0) {
		return [];
	}

	const { data, error } = await admin
		.from('sequence_emails')
		.select('*')
		.in('signal_id', signalIds)
		.order('step', { ascending: true });

	if (error) {
		throw error;
	}

	return ((data ?? []) as unknown as SequenceEmailRow[]).map((row) => ({
		...row
	}));
}

function buildSequenceSummaries(
	signals: ChurnSignal[],
	emails: SequenceEmail[]
): Map<string, SequenceSummary> {
	const grouped = new Map<string, SequenceEmail[]>();

	for (const email of emails) {
		const current = grouped.get(email.signal_id) ?? [];
		current.push(email);
		grouped.set(email.signal_id, current);
	}

	return new Map(
		signals.map((signal) => {
			const signalEmails = (grouped.get(signal.id) ?? []).sort((left, right) => left.step - right.step);
			const nextPending = signalEmails.find((email) => email.status === 'pending') ?? null;
			const totalSteps = Math.max(
				sequenceLengths[signal.signal_type],
				signalEmails.reduce((highest, email) => Math.max(highest, email.step), 0)
			);

			return [
				signal.id,
				{
					hasSequence: signalEmails.length > 0,
					totalSteps,
					currentStep: nextPending?.step ?? (signalEmails.length > 0 ? signalEmails[signalEmails.length - 1].step : null),
					nextPendingEmailId: nextPending?.id ?? null
				}
			];
		})
	);
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const organization = await resolveOrganization(locals.session?.userId);
	const now = new Date();

	if (!organization) {
		return {
			title: 'Signals',
			breadcrumb: ['ChurnPulse', 'Signals'],
			signals: [] as SignalListItem[],
			totalCount: 0,
			page: 1,
			totalPages: 1,
			filters: {
				page: 1,
				perPage: DEFAULT_PER_PAGE,
				filter: 'all' as SignalFilter,
				status: 'all' as StatusFilter,
				sort: 'date_desc' as SortKey
			},
			filterOptions: signalTypes,
			statusOptions: signalStatuses,
			nowIso: now.toISOString()
		};
	}

	const page = parsePage(url.searchParams.get('page'));
	const perPage = parsePerPage(url.searchParams.get('per_page'));
	const filter = parseSignalFilter(url.searchParams.get('filter'));
	const status = parseStatusFilter(url.searchParams.get('status'));
	const sort = parseSort(url.searchParams.get('sort'));
	const since = new Date(now);
	since.setDate(now.getDate() - 30);

	let query = admin
		.from('churn_signals')
		.select('*', { count: 'exact' })
		.eq('org_id', organization.id)
		.gte('detected_at', since.toISOString());

	if (filter !== 'all') {
		query = query.eq('signal_type', filter);
	}

	if (status !== 'all') {
		query = query.eq('status', status);
	}

	if (sort === 'mrr_desc') {
		query = query.order('mrr_amount', { ascending: false }).order('detected_at', { ascending: false });
	} else if (sort === 'mrr_asc') {
		query = query.order('mrr_amount', { ascending: true }).order('detected_at', { ascending: false });
	} else if (sort === 'date_asc') {
		query = query.order('detected_at', { ascending: true });
	} else {
		query = query.order('detected_at', { ascending: false });
	}

	const from = (page - 1) * perPage;
	const to = from + perPage - 1;
	const { data, error, count } = await query.range(from, to);

	if (error) {
		throw error;
	}

	const signals = ((data ?? []) as unknown as ChurnSignalRow[]).map(toSignal);
	const sequences = await loadSequencesForSignals(signals.map((signal) => signal.id));
	const summaries = buildSequenceSummaries(signals, sequences);
	const totalCount = count ?? 0;
	const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

	return {
		title: 'Signals',
		breadcrumb: ['ChurnPulse', 'Signals'],
		signals: signals.map((signal) => ({
			...signal,
			is_high_value: signal.mrr_amount > 50_000,
			sequence: summaries.get(signal.id) ?? {
				hasSequence: false,
				totalSteps: sequenceLengths[signal.signal_type],
				currentStep: null,
				nextPendingEmailId: null
			}
		})),
		totalCount,
		page,
		totalPages,
		filters: {
			page,
			perPage,
			filter,
			status,
			sort
		},
		filterOptions: signalTypes,
		statusOptions: signalStatuses,
		nowIso: now.toISOString()
	};
};

async function loadOwnedSignal(signalId: string, orgId: string): Promise<ChurnSignal | null> {
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

async function loadNextPendingEmailId(signalId: string, orgId: string): Promise<string | null> {
	const { data, error } = await admin
		.from('sequence_emails')
		.select('id, step')
		.eq('signal_id', signalId)
		.eq('org_id', orgId)
		.eq('status', 'pending')
		.order('step', { ascending: true })
		.limit(1)
		.maybeSingle();

	if (error) {
		throw error;
	}

	return (data as unknown as Pick<SequenceEmailRow, 'id'> | null)?.id ?? null;
}

export const actions: Actions = {
	dismissAllResolved: async ({ locals }) => {
		const organization = await resolveOrganization(locals.session?.userId);

		if (!organization) {
			return fail(404, { message: 'No workspace was found for this operator.' });
		}

		const { error } = await admin
			.from('churn_signals')
			.update({
				status: 'dismissed'
			} as never)
			.eq('org_id', organization.id)
			.in('status', ['recovered', 'churned']);

		if (error) {
			return fail(500, { message: 'Resolved signals could not be dismissed.' });
		}

		return { message: 'Resolved signals dismissed.' };
	},

	markRecovered: async ({ request, locals }) => {
		const organization = await resolveOrganization(locals.session?.userId);
		const formData = await request.formData();
		const signalId = formData.get('signalId');

		if (!organization) {
			return fail(404, { message: 'No workspace was found for this operator.' });
		}

		if (typeof signalId !== 'string') {
			return fail(400, { message: 'That signal could not be updated.' });
		}

		const { error } = await admin
			.from('churn_signals')
			.update({
				status: 'recovered',
				resolved_at: new Date().toISOString()
			} as never)
			.eq('id', signalId)
			.eq('org_id', organization.id);

		if (error) {
			return fail(500, { message: 'The signal could not be marked as recovered.' });
		}

		return { message: 'Signal marked as recovered.' };
	},

	dismissSignal: async ({ request, locals }) => {
		const organization = await resolveOrganization(locals.session?.userId);
		const formData = await request.formData();
		const signalId = formData.get('signalId');

		if (!organization) {
			return fail(404, { message: 'No workspace was found for this operator.' });
		}

		if (typeof signalId !== 'string') {
			return fail(400, { message: 'That signal could not be dismissed.' });
		}

		const { error } = await admin
			.from('churn_signals')
			.update({
				status: 'dismissed',
				resolved_at: new Date().toISOString()
			} as never)
			.eq('id', signalId)
			.eq('org_id', organization.id);

		if (error) {
			return fail(500, { message: 'The signal could not be dismissed.' });
		}

		return { message: 'Signal dismissed.' };
	},

	stopSequence: async ({ request, locals }) => {
		const organization = await resolveOrganization(locals.session?.userId);
		const formData = await request.formData();
		const signalId = formData.get('signalId');

		if (!organization) {
			return fail(404, { message: 'No workspace was found for this operator.' });
		}

		if (typeof signalId !== 'string') {
			return fail(400, { message: 'The sequence could not be updated.' });
		}

		const { error } = await admin
			.from('sequence_emails')
			.update({
				status: 'dismissed'
			} as never)
			.eq('signal_id', signalId)
			.eq('org_id', organization.id)
			.eq('status', 'pending');

		if (error) {
			return fail(500, { message: 'Pending sequence steps could not be stopped.' });
		}

		return { message: 'Pending sequence steps stopped.' };
	},

	sendSequenceNow: async ({ request, locals }) => {
		const organization = await resolveOrganization(locals.session?.userId);
		const formData = await request.formData();
		const signalId = formData.get('signalId');

		if (!organization) {
			return fail(404, { message: 'No workspace was found for this operator.' });
		}

		if (typeof signalId !== 'string') {
			return fail(400, { message: 'That signal could not be processed.' });
		}

		const signal = await loadOwnedSignal(signalId, organization.id);

		if (!signal) {
			return fail(404, { message: 'That signal could not be found in this workspace.' });
		}

		let nextPendingEmailId = await loadNextPendingEmailId(signalId, organization.id);

		if (!nextPendingEmailId && signal.status === 'detected') {
			await scheduleSequence(signal.id, signal.signal_type, organization);
			nextPendingEmailId = await loadNextPendingEmailId(signalId, organization.id);
		}

		if (!nextPendingEmailId) {
			return fail(400, { message: 'No pending sequence email is available for this signal.' });
		}

		await sendSequenceEmail(nextPendingEmailId);
		return { message: 'Sequence email sent immediately.' };
	}
};
