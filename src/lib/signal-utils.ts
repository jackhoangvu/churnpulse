import type { ChurnSignal, SignalStatus, SignalType } from '$lib/types';
import type { ChurnSignalRow } from '$lib/types/supabase';

export const signalTypes: SignalType[] = [
	'card_failed',
	'disengaged',
	'downgraded',
	'paused',
	'cancelled',
	'high_mrr_risk',
	'trial_ending'
];

export const signalStatuses: SignalStatus[] = [
	'detected',
	'sequence_started',
	'recovered',
	'churned',
	'dismissed'
];

export function isSignalType(value: string): value is SignalType {
	return signalTypes.includes(value as SignalType);
}

export function isSignalStatus(value: string): value is SignalStatus {
	return signalStatuses.includes(value as SignalStatus);
}

export function toSignalType(value: string): SignalType {
	return isSignalType(value) ? value : 'disengaged';
}

export function toSignalStatus(value: string): SignalStatus {
	return isSignalStatus(value) ? value : 'detected';
}

export function toSignal(row: ChurnSignalRow): ChurnSignal {
	return {
		...row,
		provider: (row.provider as ChurnSignal['provider']) ?? 'polar',
		signal_type: toSignalType(row.signal_type),
		status: toSignalStatus(row.status),
		metadata: row.metadata
	};
}
