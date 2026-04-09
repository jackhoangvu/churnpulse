import type {
	ChurnSignalRow,
	Database,
	Json,
	OrganizationRow,
	SequenceEmailRow
} from '$lib/types/supabase';

export type SignalType =
	| 'card_failed'
	| 'disengaged'
	| 'downgraded'
	| 'paused'
	| 'cancelled'
	| 'high_mrr_risk';

export type SignalStatus =
	| 'detected'
	| 'sequence_started'
	| 'recovered'
	| 'churned'
	| 'dismissed';

export interface ChurnSignal extends Omit<ChurnSignalRow, 'signal_type' | 'status' | 'metadata'> {
	signal_type: SignalType;
	status: SignalStatus;
	metadata: Json | null;
}

export interface Organization extends OrganizationRow {}

export interface SequenceEmail extends SequenceEmailRow {}

export type SignalConfig = {
	type: SignalType;
	label: string;
	color: string;
	icon: string;
	urgency: 'critical' | 'high' | 'medium';
};

export const SIGNAL_CONFIGS = {
	card_failed: {
		type: 'card_failed',
		label: 'Card failed',
		color: '#FF4459',
		icon: 'credit-card-alert',
		urgency: 'critical'
	},
	disengaged: {
		type: 'disengaged',
		label: 'Disengaged',
		color: '#FFB800',
		icon: 'activity-drop',
		urgency: 'high'
	},
	downgraded: {
		type: 'downgraded',
		label: 'Downgraded',
		color: '#FF8A00',
		icon: 'trend-down',
		urgency: 'high'
	},
	paused: {
		type: 'paused',
		label: 'Paused',
		color: '#4C8DFF',
		icon: 'pause',
		urgency: 'medium'
	},
	cancelled: {
		type: 'cancelled',
		label: 'Cancelled',
		color: '#FF4459',
		icon: 'x-circle',
		urgency: 'critical'
	},
	high_mrr_risk: {
		type: 'high_mrr_risk',
		label: 'High MRR risk',
		color: '#FF334F',
		icon: 'siren',
		urgency: 'critical'
	}
} satisfies Record<SignalType, SignalConfig>;

export type { Database };
