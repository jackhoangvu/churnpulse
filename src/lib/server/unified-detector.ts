import { toSignal } from '$lib/signal-utils';
import { admin } from '$lib/server/admin';
import { log, logError, logSignalDetected } from '$lib/server/logger';
import type { NormalizedEvent } from '$lib/server/normalizer';
import { scheduleSequence } from '$lib/server/sequences';
import { detectHighMrrRisk } from '$lib/server/signals';
import type { Organization } from '$lib/types';
import type { ChurnSignalRow, Json } from '$lib/types/supabase';

const DEDUP_WINDOWS: Record<string, number> = {
	card_failed: 7,
	cancelled: 30,
	downgraded: 7,
	paused: 14,
	trial_ending: 3,
	disengaged: 14,
	high_mrr_risk: 7
};

async function hasRecentSignal(
	orgId: string,
	customerId: string,
	signalType: string,
	windowDays: number
): Promise<boolean> {
	const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
	const { data, error } = await admin
		.from('churn_signals')
		.select('id')
		.eq('org_id', orgId)
		.eq('polar_customer_id', customerId)
		.eq('signal_type', signalType)
		.gte('detected_at', since)
		.limit(1)
		.maybeSingle();

	if (error) {
		throw error;
	}

	return Boolean(data);
}

async function logProviderEvent(
	orgId: string,
	event: NormalizedEvent,
	processed: boolean,
	errorMessage?: string
): Promise<void> {
	try {
		await admin.from('provider_events').insert({
			org_id: orgId,
			provider: event.provider,
			event_id: event.event_id,
			event_type: event.event_type,
			payload: event.raw as Json,
			processed,
			error_message: errorMessage ?? null
		} as never);
	} catch {
		// Logging provider events is best-effort only.
	}
}

export async function processNormalizedEvent(
	event: NormalizedEvent,
	org: Organization
): Promise<{ signal_created: boolean; signal_id: string | null }> {
	const dedupDays = DEDUP_WINDOWS[event.event_type] ?? 7;

	if (await hasRecentSignal(org.id, event.customer_id, event.event_type, dedupDays)) {
		log('info', 'unified-detector', 'Skipping duplicate signal within dedup window', {
			org_id: org.id,
			event_type: event.event_type,
			customer_id: event.customer_id
		});

		return { signal_created: false, signal_id: null };
	}

	const { data, error } = await admin
		.from('churn_signals')
		.insert({
			org_id: org.id,
			provider: event.provider,
			polar_customer_id: event.customer_id,
			customer_email: event.customer_email,
			customer_name: event.customer_name,
			signal_type: event.event_type,
			mrr_amount: event.mrr_cents,
			polar_event_id: event.event_id,
			status: 'detected',
			metadata: event.metadata as Json
		} as never)
		.select('*')
		.maybeSingle();

	if (error || !data) {
		await logProviderEvent(org.id, event, false, error?.message ?? 'Insert failed');
		throw error ?? new Error('Failed to insert signal');
	}

	const signal = toSignal(data as unknown as ChurnSignalRow);
	logSignalDetected(signal, org.id);
	await logProviderEvent(org.id, event, true);

	try {
		await detectHighMrrRisk(signal, org);
	} catch (caughtError) {
		logError('unified-detector.high-mrr', caughtError, { signal_id: signal.id });
	}

	try {
		await scheduleSequence(signal.id, signal.signal_type, org);
	} catch (caughtError) {
		logError('unified-detector.schedule', caughtError, { signal_id: signal.id });
	}

	return { signal_created: true, signal_id: signal.id };
}
