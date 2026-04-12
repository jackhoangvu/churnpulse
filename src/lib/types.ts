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
		color: 'oklch(62% 0.24 25)',
		icon: 'credit-card-alert',
		urgency: 'critical',
		description: 'Payment method declined or expired'
	},
	disengaged: {
		type: 'disengaged',
		label: 'Disengaged',
		color: 'oklch(78% 0.18 76)',
		icon: 'activity-drop',
		urgency: 'high',
		description: 'No product activity in 14+ days'
	},
	downgraded: {
		type: 'downgraded',
		label: 'Downgraded',
		color: 'oklch(72% 0.18 48)',
		icon: 'trend-down',
		urgency: 'high',
		description: 'Subscription plan reduced by >20%'
	},
	paused: {
		type: 'paused',
		label: 'Paused',
		color: 'oklch(66% 0.16 290)',
		icon: 'pause',
		urgency: 'medium',
		description: 'Subscription collection paused'
	},
	cancelled: {
		type: 'cancelled',
		label: 'Cancelled',
		color: 'oklch(62% 0.24 25)',
		icon: 'x-circle',
		urgency: 'critical',
		description: 'Subscription cancelled by customer'
	},
	high_mrr_risk: {
		type: 'high_mrr_risk',
		label: 'High MRR risk',
		color: 'oklch(58% 0.26 10)',
		icon: 'siren',
		urgency: 'critical',
		description: 'High-value customer showing risk'
	},
	trial_ending: {
		type: 'trial_ending',
		label: 'Trial ending',
		color: 'oklch(72% 0.16 305)',
		icon: 'clock',
		urgency: 'high',
		description: 'Free trial ends within 3 days'
	}
};

export const PROVIDER_META = {
	stripe: {
		label: 'Stripe',
		color: 'oklch(58% 0.23 276)',
		docsUrl: 'https://stripe.com/docs/connect',
		oauthSupported: true,
		webhookDocs: 'https://stripe.com/docs/webhooks'
	},
	paddle: {
		label: 'Paddle',
		color: 'oklch(71% 0.15 235)',
		docsUrl: 'https://developer.paddle.com/webhooks/overview',
		oauthSupported: false,
		webhookDocs: 'https://developer.paddle.com/webhooks/overview'
	},
	lemonsqueezy: {
		label: 'Lemon Squeezy',
		color: 'oklch(84% 0.17 91)',
		docsUrl: 'https://docs.lemonsqueezy.com/api/webhooks',
		oauthSupported: false,
		webhookDocs: 'https://docs.lemonsqueezy.com/api/webhooks'
	},
	polar: {
		label: 'Polar',
		color: 'oklch(55% 0.22 264)',
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
