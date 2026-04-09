import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { admin } from '$lib/server/admin';
import { logError } from '$lib/server/logger';
import { resolveOrCreateOrganization } from '$lib/server/organizations';
import { checkRateLimit } from '$lib/server/rate-limiter';
import { signalStatuses, signalTypes, toSignal } from '$lib/signal-utils';
import type { SignalStatus, SignalType } from '$lib/types';
import type { ChurnSignalRow } from '$lib/types/supabase';

type DateRange = '7d' | '30d' | '90d' | 'all';

function parsePage(value: string | null): number {
	const page = Number(value ?? '1');
	return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function parsePerPage(value: string | null): number {
	const perPage = Number(value ?? '25');
	if (!Number.isFinite(perPage) || perPage <= 0) {
		return 25;
	}

	return Math.min(100, Math.floor(perPage));
}

function parseSignalType(value: string | null): SignalType | null {
	return value && signalTypes.includes(value as SignalType) ? (value as SignalType) : null;
}

function parseSignalStatus(value: string | null): SignalStatus | null {
	return value && signalStatuses.includes(value as SignalStatus) ? (value as SignalStatus) : null;
}

function parseDateRange(value: string | null): DateRange {
	return value === '7d' || value === '90d' || value === 'all' ? value : '30d';
}

function resolveSince(dateRange: DateRange): string | null {
	if (dateRange === 'all') {
		return null;
	}

	const days = dateRange === '7d' ? 7 : dateRange === '90d' ? 90 : 30;
	const since = new Date();
	since.setDate(since.getDate() - days);
	return since.toISOString();
}

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.session?.userId) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	if (!checkRateLimit(`api:${locals.session.userId}`, 60, 60_000)) {
		return json({ error: 'rate_limited' }, { status: 429 });
	}

	try {
		const organization = await resolveOrCreateOrganization(locals.session);

		if (!organization) {
			return json({ error: 'workspace_not_found' }, { status: 404 });
		}

		const page = parsePage(url.searchParams.get('page'));
		const perPage = parsePerPage(url.searchParams.get('per_page'));
		const signalType = parseSignalType(url.searchParams.get('type'));
		const signalStatus = parseSignalStatus(url.searchParams.get('status'));
		const since = resolveSince(parseDateRange(url.searchParams.get('date_range')));
		const from = (page - 1) * perPage;
		const to = from + perPage - 1;

		let query = admin
			.from('churn_signals')
			.select('*', { count: 'exact' })
			.eq('org_id', organization.id)
			.order('detected_at', { ascending: false });

		if (signalType) {
			query = query.eq('signal_type', signalType);
		}

		if (signalStatus) {
			query = query.eq('status', signalStatus);
		}

		if (since) {
			query = query.gte('detected_at', since);
		}

		const { data, error, count } = await query.range(from, to);

		if (error) {
			throw error;
		}

		return json({
			signals: ((data ?? []) as unknown as ChurnSignalRow[]).map(toSignal),
			total: count ?? 0,
			page
		});
	} catch (error) {
		logError('api.signals.list', error, {
			user_id: locals.session.userId
		});

		return json({ error: 'internal_error' }, { status: 500 });
	}
};
