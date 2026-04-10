import { createHmac, timingSafeEqual } from 'node:crypto';
import { json } from '@sveltejs/kit';
import { PADDLE_WEBHOOK_SECRET } from '$env/static/private';
import type { RequestHandler } from './$types';
import { admin } from '$lib/server/admin';
import { getProviderConnection } from '$lib/provider-utils';
import { log, logError } from '$lib/server/logger';
import { normalizePaddleEvent } from '$lib/server/normalizer';
import { checkRateLimit } from '$lib/server/rate-limiter';
import { processNormalizedEvent } from '$lib/server/unified-detector';
import type { Organization } from '$lib/types';
import type { OrganizationRow } from '$lib/types/supabase';

const SUPPORTED_EVENTS = new Set([
	'transaction.payment_failed',
	'subscription.updated',
	'subscription.canceled',
	'subscription.trial_end_reminder'
]);

function verifyPaddleSignature(payload: string, signature: string, secret: string): boolean {
	try {
		const parts = Object.fromEntries(
			signature
				.split(';')
				.map((part) => part.split('='))
				.filter((pair): pair is [string, string] => pair.length === 2)
		);
		const timestamp = parts.ts;
		const hash = parts.h1;

		if (!timestamp || !hash) {
			return false;
		}

		const signedPayload = `${timestamp}:${payload}`;
		const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');

		return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expected, 'hex'));
	} catch {
		return false;
	}
}

async function resolveOrgByPaddleWebhookSecret(secret: string): Promise<OrganizationRow | null> {
	const { data, error } = await admin.from('organizations').select('*').limit(50);
	if (error || !data) {
		if (error) {
			throw error;
		}

		return null;
	}

	for (const organization of data as unknown as OrganizationRow[]) {
		const connection = getProviderConnection(organization.providers, 'paddle');
		if (connection?.webhook_secret === secret) {
			return organization;
		}
	}

	return null;
}

export const POST: RequestHandler = async ({ request }) => {
	const payload = await request.text();
	const signature = request.headers.get('paddle-signature') ?? '';

	if (!verifyPaddleSignature(payload, signature, PADDLE_WEBHOOK_SECRET)) {
		log('warn', 'paddle-webhook', 'Invalid Paddle signature');
		return json({ received: true });
	}

	let event: Record<string, unknown>;
	try {
		event = JSON.parse(payload) as Record<string, unknown>;
	} catch {
		return json({ received: true });
	}

	const eventType = String(event.event_type ?? '');
	if (!SUPPORTED_EVENTS.has(eventType)) {
		return json({ received: true });
	}

	const eventId = String(event.notification_id ?? event.id ?? crypto.randomUUID());
	if (!checkRateLimit(`paddle-webhook:${eventId}`, 1, 60_000)) {
		return json({ received: true });
	}

	void (async () => {
		try {
			const data = ((event.data as Record<string, unknown>) ?? {}) as Record<string, unknown>;
			const customData =
				((data.custom_data as Record<string, unknown>) ?? {}) as Record<string, unknown>;
			const orgId = typeof customData.org_id === 'string' ? customData.org_id : '';
			let organization: OrganizationRow | null = null;

			if (orgId) {
				const { data: orgData, error } = await admin
					.from('organizations')
					.select('*')
					.eq('id', orgId)
					.maybeSingle();

				if (error) {
					throw error;
				}

				organization = (orgData as unknown as OrganizationRow | null) ?? null;
			}

			if (!organization) {
				organization = await resolveOrgByPaddleWebhookSecret(PADDLE_WEBHOOK_SECRET);
			}

			if (!organization) {
				log('warn', 'paddle-webhook', 'No org found for Paddle event', {
					event_type: eventType
				});
				return;
			}

			const normalized = normalizePaddleEvent(event);
			if (!normalized) {
				return;
			}

			await processNormalizedEvent(normalized, organization as unknown as Organization);
		} catch (caughtError) {
			logError('paddle-webhook', caughtError);
		}
	})();

	return json({ received: true });
};
