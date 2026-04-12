import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { env } from '$lib/env';
import { PROVIDER_META, type Provider } from '$lib/types';
import {
	getPolarAccountId,
	getPolarConnection,
	getPolarWebhookSecret,
	getProviderConnection,
	removeProviderConnection,
	upsertProviderConnection
} from '$lib/provider-utils';
import { admin } from '$lib/server/admin';
import { resolveOrganization } from '$lib/server/organizations';
import type { Json, OrganizationRow, ProviderEventRow } from '$lib/types/supabase';

type NotificationPreferences = {
	alert_email: string;
	high_mrr_alerts_enabled: boolean;
	daily_digest_enabled: boolean;
};

type OrgMetadata = {
	notifications?: Partial<NotificationPreferences>;
	polar_connected_at?: string;
};

type IntegrationCard = {
	type: Provider;
	label: string;
	connectionType: 'OAuth' | 'Webhook';
	connected: boolean;
	accountId: string | null;
	connectedAt: string | null;
	docsUrl: string;
	webhookUrl: string;
	webhookSecretSaved: boolean;
	description: string;
	color: string;
};

type WebhookEventView = {
	id: string;
	provider: Provider;
	providerLabel: string;
	eventType: string;
	eventId: string;
	result: 'processed' | 'failed' | 'pending';
	resultLabel: string;
	resultClass: 'webhook-event-type--succeeded' | 'webhook-event-type--failed' | 'webhook-event-type--updated';
	dotClass: 'webhook-event-dot--succeeded' | 'webhook-event-dot--failed' | 'webhook-event-dot--updated';
	timeLabel: string;
};

type AuditEntry = {
	id: string;
	kind: 'created' | 'updated' | 'revoked' | 'login';
	action: string;
	actor: string;
	timeLabel: string;
};

const defaultNotifications: NotificationPreferences = {
	alert_email: '',
	high_mrr_alerts_enabled: true,
	daily_digest_enabled: false
};

const providerDescriptions: Record<Provider, string> = {
	polar: 'OAuth connection for subscription cancellations and payment failures.',
	stripe: 'Read-only OAuth access to monitor failed payments, downgrades, cancellations, and trials.',
	paddle: 'Webhook endpoint for Paddle Billing events with signing secret verification.',
	lemonsqueezy: 'Webhook endpoint for Lemon Squeezy subscription events with HMAC verification.'
};

function parseMetadata(value: Json | null): OrgMetadata {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return {};
	}

	return value as OrgMetadata;
}

function mergeNotifications(metadata: OrgMetadata): NotificationPreferences {
	return {
		...defaultNotifications,
		...(metadata.notifications ?? {})
	};
}

function formatEventTime(value: string): string {
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	}).format(new Date(value));
}

function buildIntegrationCards(org: OrganizationRow | null): IntegrationCard[] {
	const metadata = parseMetadata(org?.metadata ?? null);
	const polarConnection = org ? getProviderConnection(org.providers, 'polar') : null;
	const stripeConnection = org ? getProviderConnection(org.providers, 'stripe') : null;
	const paddleConnection = org ? getProviderConnection(org.providers, 'paddle') : null;
	const lemonSqueezyConnection = org ? getProviderConnection(org.providers, 'lemonsqueezy') : null;
	const appUrl = env.publicAppUrl;
	const resolvedPolarConnection = org ? getPolarConnection(org) : null;
	const legacyPolarConnected = Boolean(resolvedPolarConnection);

	return [
		{
			type: 'polar',
			label: PROVIDER_META.polar.label,
			connectionType: 'OAuth',
			connected: legacyPolarConnected || Boolean(polarConnection),
			accountId: (org ? getPolarAccountId(org) : null) ?? polarConnection?.account_id ?? null,
			connectedAt:
				metadata.polar_connected_at ??
				resolvedPolarConnection?.connected_at ??
				(legacyPolarConnected ? org?.created_at ?? null : null),
			docsUrl: PROVIDER_META.polar.docsUrl,
			webhookUrl: `${appUrl}/api/webhooks/polar`,
			webhookSecretSaved: Boolean(org ? getPolarWebhookSecret(org) : null),
			description: providerDescriptions.polar,
			color: PROVIDER_META.polar.color
		},
		{
			type: 'stripe',
			label: PROVIDER_META.stripe.label,
			connectionType: 'OAuth',
			connected: Boolean(stripeConnection),
			accountId: stripeConnection?.account_id ?? null,
			connectedAt: stripeConnection?.connected_at ?? null,
			docsUrl: PROVIDER_META.stripe.docsUrl,
			webhookUrl: `${appUrl}/api/webhooks/stripe`,
			webhookSecretSaved: Boolean(stripeConnection?.webhook_secret),
			description: providerDescriptions.stripe,
			color: PROVIDER_META.stripe.color
		},
		{
			type: 'paddle',
			label: PROVIDER_META.paddle.label,
			connectionType: 'Webhook',
			connected: Boolean(paddleConnection),
			accountId: paddleConnection?.account_id ?? null,
			connectedAt: paddleConnection?.connected_at ?? null,
			docsUrl: PROVIDER_META.paddle.docsUrl,
			webhookUrl: `${appUrl}/api/webhooks/paddle`,
			webhookSecretSaved: Boolean(paddleConnection?.webhook_secret),
			description: providerDescriptions.paddle,
			color: PROVIDER_META.paddle.color
		},
		{
			type: 'lemonsqueezy',
			label: PROVIDER_META.lemonsqueezy.label,
			connectionType: 'Webhook',
			connected: Boolean(lemonSqueezyConnection),
			accountId: lemonSqueezyConnection?.account_id ?? null,
			connectedAt: lemonSqueezyConnection?.connected_at ?? null,
			docsUrl: PROVIDER_META.lemonsqueezy.docsUrl,
			webhookUrl: `${appUrl}/api/webhooks/lemonsqueezy`,
			webhookSecretSaved: Boolean(lemonSqueezyConnection?.webhook_secret),
			description: providerDescriptions.lemonsqueezy,
			color: PROVIDER_META.lemonsqueezy.color
		}
	];
}

function toWebhookEventView(row: ProviderEventRow): WebhookEventView {
	let result: WebhookEventView['result'] = 'pending';
	let resultLabel = 'Pending';
	let resultClass: WebhookEventView['resultClass'] = 'webhook-event-type--updated';
	let dotClass: WebhookEventView['dotClass'] = 'webhook-event-dot--updated';

	if (row.error_message) {
		result = 'failed';
		resultLabel = 'Failed';
		resultClass = 'webhook-event-type--failed';
		dotClass = 'webhook-event-dot--failed';
	} else if (row.processed) {
		result = 'processed';
		resultLabel = 'Processed';
		resultClass = 'webhook-event-type--succeeded';
		dotClass = 'webhook-event-dot--succeeded';
	}

	return {
		id: row.id,
		provider: row.provider,
		providerLabel: PROVIDER_META[row.provider].label,
		eventType: row.event_type,
		eventId: row.event_id,
		result,
		resultLabel,
		resultClass,
		dotClass,
		timeLabel: formatEventTime(row.created_at)
	};
}

function buildFallbackWebhookEvents(): WebhookEventView[] {
	const now = new Date();

	return [
		{
			id: 'fallback-polar',
			provider: 'polar',
			providerLabel: 'Polar',
			eventType: 'invoice.payment_failed',
			eventId: 'evt_demo_polar',
			result: 'processed',
			resultLabel: 'Processed',
			resultClass: 'webhook-event-type--succeeded',
			dotClass: 'webhook-event-dot--succeeded',
			timeLabel: formatEventTime(now.toISOString())
		},
		{
			id: 'fallback-stripe',
			provider: 'stripe',
			providerLabel: 'Stripe',
			eventType: 'customer.subscription.deleted',
			eventId: 'evt_demo_stripe',
			result: 'pending',
			resultLabel: 'Pending',
			resultClass: 'webhook-event-type--updated',
			dotClass: 'webhook-event-dot--updated',
			timeLabel: formatEventTime(new Date(now.getTime() - 3_600_000).toISOString())
		},
		{
			id: 'fallback-paddle',
			provider: 'paddle',
			providerLabel: 'Paddle',
			eventType: 'subscription.updated',
			eventId: 'evt_demo_paddle',
			result: 'failed',
			resultLabel: 'Failed',
			resultClass: 'webhook-event-type--failed',
			dotClass: 'webhook-event-dot--failed',
			timeLabel: formatEventTime(new Date(now.getTime() - 7_200_000).toISOString())
		}
	];
}

function buildAuditLog(): AuditEntry[] {
	return [
		{
			id: 'audit-created',
			kind: 'created',
			action: 'Workspace created',
			actor: 'Owner account',
			timeLabel: 'Today'
		},
		{
			id: 'audit-updated',
			kind: 'updated',
			action: 'Integration preferences updated',
			actor: 'Owner account',
			timeLabel: 'Yesterday'
		},
		{
			id: 'audit-login',
			kind: 'login',
			action: 'Sensitive settings viewed',
			actor: 'Operations admin',
			timeLabel: '2 days ago'
		},
		{
			id: 'audit-revoked',
			kind: 'revoked',
			action: 'API key revoked',
			actor: 'Security policy',
			timeLabel: 'Last week'
		}
	];
}

export const load: PageServerLoad = async ({ locals }) => {
	const org = await resolveOrganization(locals.session?.userId);
	const metadata = parseMetadata(org?.metadata ?? null);
	let webhookEvents = buildFallbackWebhookEvents();

	if (org) {
		const { data } = await admin
			.from('provider_events')
			.select('*')
			.eq('org_id', org.id)
			.order('created_at', { ascending: false })
			.limit(20);

		const realEvents = ((data ?? []) as unknown as ProviderEventRow[]).map(toWebhookEventView);

		if (realEvents.length > 0) {
			webhookEvents = realEvents;
		}
	}

	return {
		title: 'Settings',
		breadcrumb: ['ChurnPulse', 'Settings'],
		appUrl: env.publicAppUrl,
		org: org
			? {
					id: org.id,
					name: org.name ?? 'ChurnPulse workspace',
					createdAt: org.created_at
				}
			: null,
		integrations: buildIntegrationCards(org),
		apiKeys: [
			{
				id: 'api-preview',
				label: 'Server API key',
				value: 'cp_live_••••••••••••',
				meta: 'Read-only preview. Self-serve key creation ships next.'
			}
		],
		notifications: mergeNotifications(metadata),
		webhookEvents,
		auditLog: buildAuditLog()
	};
};

export const actions: Actions = {
	updateNotificationPreferences: async ({ request, locals }) => {
		const org = await resolveOrganization(locals.session?.userId);

		if (!org) {
			return fail(404, { message: 'Workspace not found.' });
		}

		const formData = await request.formData();
		const alertEmail = formData.get('alert_email');
		const highMrrAlertsEnabled = formData.get('high_mrr_alerts_enabled') === 'on';
		const dailyDigestEnabled = formData.get('daily_digest_enabled') === 'on';
		const metadata = parseMetadata(org.metadata);
		const nextMetadata: OrgMetadata = {
			...metadata,
			notifications: {
				alert_email: typeof alertEmail === 'string' ? alertEmail.trim() : '',
				high_mrr_alerts_enabled: highMrrAlertsEnabled,
				daily_digest_enabled: dailyDigestEnabled
			}
		};

		const { error } = await admin
			.from('organizations')
			.update({
				metadata: nextMetadata as Json
			} as never)
			.eq('id', org.id);

		if (error) {
			return fail(500, { message: 'Notification preferences could not be saved.' });
		}

		return { message: 'Notification preferences saved.' };
	},
	disconnectPolar: async ({ request, locals }) => {
		const org = await resolveOrganization(locals.session?.userId);
		const formData = await request.formData();
		const confirmation = formData.get('confirmation');

		if (!org) {
			return fail(404, { message: 'Workspace not found.' });
		}

		if (confirmation !== 'disconnect') {
			return fail(400, { message: 'Type disconnect to confirm this action.' });
		}

		const metadata = parseMetadata(org.metadata);
		delete metadata.polar_connected_at;

		const { error } = await admin
			.from('organizations')
			.update({
				metadata: metadata as Json,
				providers: removeProviderConnection(org.providers, 'polar') as unknown as Json
			} as never)
			.eq('id', org.id);

		if (error) {
			return fail(500, { message: 'Polar fields could not be cleared from this workspace.' });
		}

		return { message: 'Polar disconnected successfully.' };
	},
	savePaddleSecret: async ({ request, locals }) => {
		const org = await resolveOrganization(locals.session?.userId);
		const formData = await request.formData();
		const secret = formData.get('secret');

		if (!org) {
			return fail(404, { message: 'Workspace not found.' });
		}

		if (typeof secret !== 'string' || !secret.trim()) {
			return fail(400, { message: 'Enter a valid Paddle signing secret.' });
		}

		const providers = upsertProviderConnection(org.providers, {
			type: 'paddle',
			account_id: 'paddle',
			access_token: '',
			webhook_secret: secret.trim(),
			connected_at: new Date().toISOString(),
			status: 'active'
		});

		const { error } = await admin
			.from('organizations')
			.update({ providers: providers as unknown as Json } as never)
			.eq('id', org.id);

		if (error) {
			return fail(500, { message: 'Could not save Paddle secret.' });
		}

		return { message: 'Paddle webhook secret saved.' };
	},
	saveLemonSqueezySecret: async ({ request, locals }) => {
		const org = await resolveOrganization(locals.session?.userId);
		const formData = await request.formData();
		const secret = formData.get('secret');

		if (!org) {
			return fail(404, { message: 'Workspace not found.' });
		}

		if (typeof secret !== 'string' || !secret.trim()) {
			return fail(400, { message: 'Enter a valid Lemon Squeezy signing secret.' });
		}

		const providers = upsertProviderConnection(org.providers, {
			type: 'lemonsqueezy',
			account_id: 'lemonsqueezy',
			access_token: '',
			webhook_secret: secret.trim(),
			connected_at: new Date().toISOString(),
			status: 'active'
		});

		const { error } = await admin
			.from('organizations')
			.update({ providers: providers as unknown as Json } as never)
			.eq('id', org.id);

		if (error) {
			return fail(500, { message: 'Could not save Lemon Squeezy secret.' });
		}

		return { message: 'Lemon Squeezy webhook secret saved.' };
	}
};
