import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { env } from '$lib/env';
import {
	getProviderConnection,
	removeProviderConnection,
	upsertProviderConnection
} from '$lib/provider-utils';
import { admin } from '$lib/server/admin';
import { resolveOrganization as resolveStoredOrganization } from '$lib/server/organizations';
import type { SignalType } from '$lib/types';
import type { Json, OrganizationRow } from '$lib/types/supabase';

type SequencePreferences = Record<SignalType, boolean>;
type NotificationPreferences = {
	alert_email: string;
	high_mrr_alerts_enabled: boolean;
	daily_digest_enabled: boolean;
};
type OrgMetadata = {
	sequence_preferences?: Partial<SequencePreferences>;
	notifications?: Partial<NotificationPreferences>;
	polar_connected_at?: string;
	stripe_connected_at?: string;
};

const signalTypes: SignalType[] = [
	'card_failed',
	'disengaged',
	'downgraded',
	'paused',
	'cancelled',
	'high_mrr_risk',
	'trial_ending'
];

const defaultSequencePreferences: SequencePreferences = {
	card_failed: true,
	disengaged: true,
	downgraded: true,
	paused: true,
	cancelled: true,
	high_mrr_risk: true,
	trial_ending: true
};

const defaultNotifications: NotificationPreferences = {
	alert_email: '',
	high_mrr_alerts_enabled: true,
	daily_digest_enabled: false
};

function parseMetadata(value: Json | null): OrgMetadata {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return {};
	}

	return value as OrgMetadata;
}

function mergeSequencePreferences(metadata: OrgMetadata): SequencePreferences {
	return {
		...defaultSequencePreferences,
		...(metadata.sequence_preferences ?? {})
	};
}

function mergeNotifications(metadata: OrgMetadata): NotificationPreferences {
	return {
		...defaultNotifications,
		...(metadata.notifications ?? {})
	};
}

async function resolveOrganization(userId: string | undefined): Promise<OrganizationRow | null> {
	return resolveStoredOrganization(userId);
}

async function updateOrgMetadata(org: OrganizationRow, patch: Partial<OrgMetadata>): Promise<void> {
	const metadata = parseMetadata(org.metadata);
	const merged: OrgMetadata = {
		...metadata,
		...patch
	};

	if (patch.sequence_preferences) {
		merged.sequence_preferences = {
			...mergeSequencePreferences(metadata),
			...patch.sequence_preferences
		};
	}

	if (patch.notifications) {
		merged.notifications = {
			...mergeNotifications(metadata),
			...patch.notifications
		};
	}

	const { error } = await admin
		.from('organizations')
		.update({
			metadata: merged as Json
		} as never)
		.eq('id', org.id);

	if (error) {
		throw error;
	}
}

function sequenceStepCopy(type: SignalType): string {
	if (type === 'card_failed') {
		return '3 steps: immediate retry, 24h reminder, final notice';
	}

	if (type === 'disengaged') {
		return '3 steps: check-in, feedback request, return offer';
	}

	if (type === 'cancelled') {
		return '3 steps: farewell, product update, return incentive';
	}

	if (type === 'downgraded') {
		return '2 steps: plan feedback, value follow-up';
	}

	if (type === 'paused') {
		return '3 steps: 7d reminder, 14d follow-up, 21d final reactivation';
	}

	if (type === 'trial_ending') {
		return '1 step: immediate conversion nudge before the trial ends';
	}

	return '1 step: founder-level outreach';
}

function parseBoolean(value: unknown): boolean {
	return value === true || value === 'true';
}

export const load: PageServerLoad = async ({ locals }) => {
	const organization = await resolveOrganization(locals.session?.userId);

	if (!organization) {
		return {
			title: 'Settings',
			breadcrumb: ['ChurnPulse', 'Settings'],
			appUrl: env.publicAppUrl,
			org: null,
			polar: {
				connected: false,
				accountId: null,
				organizationId: null,
				connectedAt: null
			},
			integrations: {
				stripe: { connected: false, accountId: null },
				paddle: { connected: false, accountId: null },
				lemonsqueezy: { connected: false, accountId: null }
			},
			sequencePreferences: defaultSequencePreferences,
			sequenceSteps: signalTypes.map((type) => ({
				type,
				description: sequenceStepCopy(type)
			})),
			notifications: defaultNotifications
		};
	}

	const metadata = parseMetadata(organization.metadata);
	const polarConnection = getProviderConnection(organization.providers, 'polar');
	const stripeConnection = getProviderConnection(organization.providers, 'stripe');
	const paddleConnection = getProviderConnection(organization.providers, 'paddle');
	const lemonSqueezyConnection = getProviderConnection(organization.providers, 'lemonsqueezy');
	const legacyPolarConnected = Boolean(
		organization.polar_account_id ||
			organization.polar_organization_id ||
			organization.polar_access_token
	);

	return {
		title: 'Settings',
		breadcrumb: ['ChurnPulse', 'Settings'],
		appUrl: env.publicAppUrl,
		org: {
			id: organization.id,
			name: organization.name ?? 'ChurnPulse workspace',
			createdAt: organization.created_at
		},
		polar: {
			connected: legacyPolarConnected || Boolean(polarConnection),
			accountId:
				organization.polar_account_id ??
				organization.polar_organization_id ??
				polarConnection?.account_id ??
				null,
			organizationId:
				organization.polar_organization_id ??
				organization.polar_account_id ??
				polarConnection?.account_id ??
				null,
			connectedAt:
				metadata.polar_connected_at ??
				polarConnection?.connected_at ??
				(legacyPolarConnected ? organization.created_at : null)
		},
		integrations: {
			stripe: {
				connected: Boolean(stripeConnection),
				accountId: stripeConnection?.account_id ?? null
			},
			paddle: {
				connected: Boolean(paddleConnection),
				accountId: paddleConnection?.account_id ?? null
			},
			lemonsqueezy: {
				connected: Boolean(lemonSqueezyConnection),
				accountId: lemonSqueezyConnection?.account_id ?? null
			}
		},
		sequencePreferences: mergeSequencePreferences(metadata),
		sequenceSteps: signalTypes.map((type) => ({
			type,
			description: sequenceStepCopy(type)
		})),
		notifications: mergeNotifications(metadata)
	};
};

export const actions: Actions = {
	updateOrgName: async ({ request, locals }) => {
		const organization = await resolveOrganization(locals.session?.userId);
		const formData = await request.formData();
		const orgName = formData.get('orgName');

		if (!organization) {
			return fail(404, { message: 'Workspace not found.' });
		}

		if (typeof orgName !== 'string' || !orgName.trim()) {
			return fail(400, { message: 'Enter a workspace name before saving.' });
		}

		const { error } = await admin
			.from('organizations')
			.update({
				name: orgName.trim()
			} as never)
			.eq('id', organization.id);

		if (error) {
			return fail(500, { message: 'Workspace name could not be updated.' });
		}

		return { message: 'Workspace name updated.' };
	},

	disconnectPolar: async ({ request, locals }) => {
		const organization = await resolveOrganization(locals.session?.userId);
		const formData = await request.formData();
		const confirmation = formData.get('confirmation');

		if (!organization) {
			return fail(404, { message: 'Workspace not found.' });
		}

		if (confirmation !== 'disconnect') {
			return fail(400, { message: 'Type disconnect to confirm this action.' });
		}

		const metadata = parseMetadata(organization.metadata);
		delete metadata.polar_connected_at;

		const { error } = await admin
			.from('organizations')
			.update({
				metadata: metadata as Json,
				providers: removeProviderConnection(organization.providers, 'polar') as unknown as Json,
				polar_account_id: null,
				polar_access_token: null,
				polar_refresh_token: null,
				polar_webhook_secret: null,
				polar_organization_id: null
			} as never)
			.eq('id', organization.id);

		if (error) {
			return fail(500, { message: 'Polar fields could not be cleared from this workspace.' });
		}

		return { message: 'Polar disconnected successfully.' };
	},

	updateSequencePreferences: async ({ request, locals }) => {
		const organization = await resolveOrganization(locals.session?.userId);
		const formData = await request.formData();
		const rawPreferences = formData.get('preferences');

		if (!organization) {
			return fail(404, { message: 'Workspace not found.' });
		}

		if (typeof rawPreferences !== 'string') {
			return fail(400, { message: 'Sequence preferences were not provided.' });
		}

		try {
			const parsed = JSON.parse(rawPreferences) as Partial<Record<SignalType, boolean>>;
			const normalized = signalTypes.reduce(
				(accumulator, type) => {
					accumulator[type] = parseBoolean(parsed[type]);
					return accumulator;
				},
				{} as SequencePreferences
			);

			await updateOrgMetadata(organization, {
				sequence_preferences: normalized
			});
		} catch {
			return fail(400, { message: 'Sequence preferences could not be parsed.' });
		}

		return { message: 'Sequence preferences saved.' };
	},

	updateNotificationPreferences: async ({ request, locals }) => {
		const organization = await resolveOrganization(locals.session?.userId);
		const formData = await request.formData();
		const rawNotifications = formData.get('notifications');

		if (!organization) {
			return fail(404, { message: 'Workspace not found.' });
		}

		if (typeof rawNotifications !== 'string') {
			return fail(400, { message: 'Notification settings were not provided.' });
		}

		try {
			const parsed = JSON.parse(rawNotifications) as Partial<NotificationPreferences>;
			await updateOrgMetadata(organization, {
				notifications: {
					alert_email:
						typeof parsed.alert_email === 'string' ? parsed.alert_email.trim() : '',
					high_mrr_alerts_enabled: parseBoolean(parsed.high_mrr_alerts_enabled),
					daily_digest_enabled: parseBoolean(parsed.daily_digest_enabled)
				}
			});
		} catch {
			return fail(400, { message: 'Notification settings could not be parsed.' });
		}

		return { message: 'Notification settings saved.' };
	},

	testWebhook: async ({ locals, fetch, url }) => {
		const organization = await resolveOrganization(locals.session?.userId);

		if (!organization) {
			return fail(404, { message: 'Workspace not found.' });
		}

		const response = await fetch(new URL('/api/test/webhook', url.origin), {
			method: 'POST',
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				event_type: 'invoice.payment_failed',
				org_id: organization.id
			})
		});
		const payload = (await response.json()) as {
			event_generated?: string;
			signal_created?: boolean;
			sequence_scheduled?: boolean;
			error?: string;
			message?: string;
		};

		if (!response.ok) {
			return fail(response.status, {
				message: payload.message ?? 'Test webhook failed.',
				webhookResult: null
			});
		}

		return {
			message: 'Webhook test completed.',
			webhookResult: {
				eventGenerated: payload.event_generated ?? 'unknown',
				signalCreated: Boolean(payload.signal_created),
				sequenceScheduled: Boolean(payload.sequence_scheduled)
			}
		};
	},

	savePaddleSecret: async ({ request, locals }) => {
		const organization = await resolveOrganization(locals.session?.userId);
		const formData = await request.formData();
		const secret = formData.get('secret');

		if (!organization) {
			return fail(404, { message: 'Workspace not found.' });
		}

		if (typeof secret !== 'string' || !secret.trim()) {
			return fail(400, { message: 'Enter a valid Paddle signing secret.' });
		}

		const providers = upsertProviderConnection(organization.providers, {
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
			.eq('id', organization.id);

		if (error) {
			return fail(500, { message: 'Could not save Paddle secret.' });
		}

		return { message: 'Paddle webhook secret saved.' };
	},

	saveLemonSqueezySecret: async ({ request, locals }) => {
		const organization = await resolveOrganization(locals.session?.userId);
		const formData = await request.formData();
		const secret = formData.get('secret');

		if (!organization) {
			return fail(404, { message: 'Workspace not found.' });
		}

		if (typeof secret !== 'string' || !secret.trim()) {
			return fail(400, { message: 'Enter a valid Lemon Squeezy signing secret.' });
		}

		const providers = upsertProviderConnection(organization.providers, {
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
			.eq('id', organization.id);

		if (error) {
			return fail(500, { message: 'Could not save Lemon Squeezy secret.' });
		}

		return { message: 'Lemon Squeezy webhook secret saved.' };
	}
};
