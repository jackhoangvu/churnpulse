import { Buffer } from 'node:buffer';
import { createClient } from '@supabase/supabase-js';
import { fail } from '@sveltejs/kit';
import { STRIPE_CLIENT_ID, STRIPE_SECRET_KEY } from '$env/static/private';
import type { Actions, PageServerLoad } from './$types';
import { env } from '$lib/env';
import { resolveOrganization as resolveStoredOrganization } from '$lib/server/organizations';
import type { Database, Json, OrganizationRow } from '$lib/types/supabase';
import type { SignalType } from '$lib/types';

type SequencePreferences = Record<SignalType, boolean>;
type NotificationPreferences = {
	alert_email: string;
	high_mrr_alerts_enabled: boolean;
	daily_digest_enabled: boolean;
};
type OrgMetadata = {
	sequence_preferences?: Partial<SequencePreferences>;
	notifications?: Partial<NotificationPreferences>;
	stripe_connected_at?: string;
};

const admin = createClient<Database, 'public'>(env.supabaseUrl, env.supabaseServiceRoleKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false
	}
});

const signalTypes: SignalType[] = [
	'card_failed',
	'disengaged',
	'downgraded',
	'paused',
	'cancelled',
	'high_mrr_risk'
];
const defaultSequencePreferences: SequencePreferences = {
	card_failed: true,
	disengaged: true,
	downgraded: true,
	paused: true,
	cancelled: true,
	high_mrr_risk: true
};
const defaultNotifications: NotificationPreferences = {
	alert_email: '',
	high_mrr_alerts_enabled: true,
	daily_digest_enabled: false
};

function parseMetadata(value: Json | null): OrgMetadata {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
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
			org: null,
			stripe: {
				connected: false,
				accountId: null,
				connectedAt: null
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

	return {
		title: 'Settings',
		breadcrumb: ['ChurnPulse', 'Settings'],
		org: {
			id: organization.id,
			name: organization.name ?? 'ChurnPulse workspace',
			createdAt: organization.created_at
		},
		stripe: {
			connected: Boolean(organization.stripe_account_id),
			accountId: organization.stripe_account_id,
			connectedAt: metadata.stripe_connected_at ?? organization.created_at
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

	disconnectStripe: async ({ request, locals }) => {
		const organization = await resolveOrganization(locals.session?.userId);
		const formData = await request.formData();
		const confirmation = formData.get('confirmation');

		if (!organization) {
			return fail(404, { message: 'Workspace not found.' });
		}

		if (confirmation !== 'disconnect') {
			return fail(400, { message: 'Type disconnect to confirm this action.' });
		}

		if (organization.stripe_account_id) {
			const response = await fetch('https://connect.stripe.com/oauth/deauthorize', {
				method: 'POST',
				headers: {
					Authorization: `Basic ${Buffer.from(`${STRIPE_SECRET_KEY}:`).toString('base64')}`,
					'content-type': 'application/x-www-form-urlencoded'
				},
				body: new URLSearchParams({
					client_id: STRIPE_CLIENT_ID,
					stripe_user_id: organization.stripe_account_id
				})
			});

			if (!response.ok) {
				return fail(500, { message: 'Stripe disconnect could not be completed.' });
			}
		}

		const metadata = parseMetadata(organization.metadata);
		delete metadata.stripe_connected_at;

		const { error } = await admin
			.from('organizations')
			.update({
				metadata: metadata as Json,
				stripe_account_id: null,
				stripe_access_token: null,
				stripe_refresh_token: null,
				stripe_webhook_secret: null
			} as never)
			.eq('id', organization.id);

		if (error) {
			return fail(500, { message: 'Stripe fields could not be cleared from this workspace.' });
		}

		return { message: 'Stripe disconnected successfully.' };
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
					alert_email: typeof parsed.alert_email === 'string' ? parsed.alert_email.trim() : '',
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
	}
};
