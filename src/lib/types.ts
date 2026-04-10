import type {
	ChurnSignalRow,
	Database,
	Json,
	OrganizationRow,
	Provider,
	ProviderConnection,
	SequenceEmailRow
} from '$lib/types/supabase';

export type { Provider, ProviderConnection };

export type SignalType =
	| 'card_failed'
	| 'disengaged'
	| 'downgraded'
	| 'paused'
	| 'cancelled'
	| 'high_mrr_risk'
	| 'trial_ending';

export type SignalStatus =
	| 'detected'
	| 'sequence_started'
	| 'recovered'
	| 'churned'
	| 'dismissed';

export interface ChurnSignal
	extends Omit<ChurnSignalRow, 'signal_type' | 'status' | 'metadata' | 'provider'> {
	provider: Provider;
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
	description: string;
};

export const SIGNAL_CONFIGS: Record<SignalType, SignalConfig> = {
	card_failed: {
		type: 'card_failed',
		label: 'Card failed',
		color: '#F05252',
		icon: 'credit-card-alert',
		urgency: 'critical',
		description: 'Payment method declined or expired'
	},
	disengaged: {
		type: 'disengaged',
		label: 'Disengaged',
		color: '#F59E0B',
		icon: 'activity-drop',
		urgency: 'high',
		description: 'No product activity in 14+ days'
	},
	downgraded: {
		type: 'downgraded',
		label: 'Downgraded',
		color: '#FB923C',
		icon: 'trend-down',
		urgency: 'high',
		description: 'Subscription plan reduced by >20%'
	},
	paused: {
		type: 'paused',
		label: 'Paused',
		color: '#818CF8',
		icon: 'pause',
		urgency: 'medium',
		description: 'Subscription collection paused'
	},
	cancelled: {
		type: 'cancelled',
		label: 'Cancelled',
		color: '#F05252',
		icon: 'x-circle',
		urgency: 'critical',
		description: 'Subscription cancelled by customer'
	},
	high_mrr_risk: {
		type: 'high_mrr_risk',
		label: 'High MRR risk',
		color: '#FF2D55',
		icon: 'siren',
		urgency: 'critical',
		description: 'High-value customer showing risk'
	},
	trial_ending: {
		type: 'trial_ending',
		label: 'Trial ending',
		color: '#A78BFA',
		icon: 'clock',
		urgency: 'high',
		description: 'Free trial ends within 3 days'
	}
};

export const PROVIDER_META = {
	stripe: {
		label: 'Stripe',
		color: '#635BFF',
		docsUrl: 'https://stripe.com/docs/connect',
		oauthSupported: true,
		webhookDocs: 'https://stripe.com/docs/webhooks'
	},
	paddle: {
		label: 'Paddle',
		color: '#0EA5E9',
		docsUrl: 'https://developer.paddle.com/webhooks/overview',
		oauthSupported: false,
		webhookDocs: 'https://developer.paddle.com/webhooks/overview'
	},
	lemonsqueezy: {
		label: 'Lemon Squeezy',
		color: '#FFC233',
		docsUrl: 'https://docs.lemonsqueezy.com/api/webhooks',
		oauthSupported: false,
		webhookDocs: 'https://docs.lemonsqueezy.com/api/webhooks'
	},
	polar: {
		label: 'Polar',
		color: '#4F6EF7',
		docsUrl: 'https://docs.polar.sh/integrate/webhooks',
		oauthSupported: true,
		webhookDocs: 'https://docs.polar.sh/integrate/webhooks'
	}
} as const satisfies Record<
	Provider,
	{
		label: string;
		color: string;
		docsUrl: string;
		oauthSupported: boolean;
		webhookDocs: string;
	}
>;

export type { Database };
