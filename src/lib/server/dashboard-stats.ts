import type { ChurnSignal, SignalStatus, SignalType } from '$lib/types';
import type { ChurnSignalRow } from '$lib/types/supabase';
import { admin } from '$lib/server/admin';
import { toSignal } from '$lib/signal-utils';

export type DashboardStats = {
	totalDetected: number;
	countsByStatus: Record<SignalStatus, number>;
	countsBySignalType: Record<SignalType, number>;
	atRiskMrr: number;
	recoveredMrr: number;
	recoveryRate: number;
	activeSignals: number;
	sparkline: Array<{
		date: string;
		label: string;
		count: number;
	}>;
	recentSignals: ChurnSignal[];
	scheduledToday: number;
	weekDeltas: {
		atRiskMrr: number;
		recoveredMrr: number;
		activeSignals: number;
		recoveryRate: number;
	};
};

function startOfDay(date: Date): Date {
	const copy = new Date(date);
	copy.setHours(0, 0, 0, 0);
	return copy;
}

function endOfDay(date: Date): Date {
	const copy = new Date(date);
	copy.setHours(23, 59, 59, 999);
	return copy;
}

function emptyStatusCounts(): Record<SignalStatus, number> {
	return {
		detected: 0,
		sequence_started: 0,
		recovered: 0,
		churned: 0,
		dismissed: 0
	};
}

function emptySignalCounts(): Record<SignalType, number> {
	return {
		card_failed: 0,
		disengaged: 0,
		downgraded: 0,
		paused: 0,
		cancelled: 0,
		high_mrr_risk: 0,
		trial_ending: 0
	};
}

function sumAtRisk(rows: ChurnSignal[]): number {
	return rows.reduce((total, row) => {
		if (row.status === 'detected' || row.status === 'sequence_started') {
			return total + row.mrr_amount;
		}

		return total;
	}, 0);
}

function sumRecovered(rows: ChurnSignal[]): number {
	return rows.reduce((total, row) => {
		if (row.status === 'recovered') {
			return total + row.mrr_amount;
		}

		return total;
	}, 0);
}

function countActiveSignals(rows: ChurnSignal[]): number {
	return rows.filter(
		(row) =>
			row.status !== 'dismissed' && row.status !== 'recovered' && row.status !== 'churned'
	).length;
}

function calculateRecoveryRate(rows: ChurnSignal[]): number {
	const recovered = rows.filter((row) => row.status === 'recovered').length;
	const churned = rows.filter((row) => row.status === 'churned').length;
	const denominator = recovered + churned;

	if (denominator === 0) {
		return 0;
	}

	return Math.round((recovered / denominator) * 100);
}

function buildSparkline(rows: ChurnSignal[], now: Date): DashboardStats['sparkline'] {
	const formatter = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' });
	const buckets = new Map<string, { date: string; label: string; count: number }>();
	const today = startOfDay(now);

	for (let offset = 6; offset >= 0; offset -= 1) {
		const date = new Date(today);
		date.setDate(today.getDate() - offset);
		const isoDate = date.toISOString().slice(0, 10);
		buckets.set(isoDate, {
			date: isoDate,
			label: formatter.format(date),
			count: 0
		});
	}

	for (const row of rows) {
		const key = row.detected_at.slice(0, 10);
		const bucket = buckets.get(key);

		if (bucket) {
			bucket.count += 1;
		}
	}

	return [...buckets.values()];
}

function resolveWeekDeltas(rows: ChurnSignal[], now: Date): DashboardStats['weekDeltas'] {
	const currentWeekStart = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));
	const previousWeekStart = startOfDay(new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000));
	const previousWeekEnd = endOfDay(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));

	const currentWeekRows = rows.filter((row) => {
		const detectedAt = new Date(row.detected_at);
		return detectedAt >= currentWeekStart;
	});
	const previousWeekRows = rows.filter((row) => {
		const detectedAt = new Date(row.detected_at);
		return detectedAt >= previousWeekStart && detectedAt <= previousWeekEnd;
	});

	return {
		atRiskMrr: sumAtRisk(currentWeekRows) - sumAtRisk(previousWeekRows),
		recoveredMrr: sumRecovered(currentWeekRows) - sumRecovered(previousWeekRows),
		activeSignals: countActiveSignals(currentWeekRows) - countActiveSignals(previousWeekRows),
		recoveryRate: calculateRecoveryRate(currentWeekRows) - calculateRecoveryRate(previousWeekRows)
	};
}

async function loadSignals(orgId: string, sinceIso: string): Promise<ChurnSignal[]> {
	const { data, error } = await admin
		.from('churn_signals')
		.select('*')
		.eq('org_id', orgId)
		.gte('detected_at', sinceIso)
		.order('detected_at', { ascending: false });

	if (error) {
		throw error;
	}

	return ((data ?? []) as unknown as ChurnSignalRow[]).map(toSignal);
}

async function loadScheduledToday(orgId: string, now: Date): Promise<number> {
	const { count, error } = await admin
		.from('sequence_emails')
		.select('*', { count: 'exact', head: true })
		.eq('org_id', orgId)
		.eq('status', 'pending')
		.gte('scheduled_for', startOfDay(now).toISOString())
		.lte('scheduled_for', endOfDay(now).toISOString());

	if (error) {
		throw error;
	}

	return count ?? 0;
}

export async function loadDashboardStats(orgId: string, now = new Date()): Promise<DashboardStats> {
	const thirtyDaysAgo = new Date(now);
	thirtyDaysAgo.setDate(now.getDate() - 30);

	const [signals, scheduledToday] = await Promise.all([
		loadSignals(orgId, thirtyDaysAgo.toISOString()),
		loadScheduledToday(orgId, now)
	]);

	const countsByStatus = emptyStatusCounts();
	const countsBySignalType = emptySignalCounts();

	for (const row of signals) {
		countsByStatus[row.status] += 1;
		countsBySignalType[row.signal_type] += 1;
	}

	return {
		totalDetected: signals.length,
		countsByStatus,
		countsBySignalType,
		atRiskMrr: sumAtRisk(signals),
		recoveredMrr: sumRecovered(signals),
		recoveryRate: calculateRecoveryRate(signals),
		activeSignals: countActiveSignals(signals),
		sparkline: buildSparkline(signals, now),
		recentSignals: signals.slice(0, 5),
		scheduledToday,
		weekDeltas: resolveWeekDeltas(signals, now)
	};
}
