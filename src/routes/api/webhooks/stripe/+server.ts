import { json } from '@sveltejs/kit';
import Stripe from 'stripe';
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from '$env/static/private';
import type { RequestHandler } from './$types';
import { admin } from '$lib/server/admin';
import { log, logError } from '$lib/server/logger';
import { normalizeStripeEvent } from '$lib/server/normalizer';
import { checkRateLimit } from '$lib/server/rate-limiter';
import { processNormalizedEvent } from '$lib/server/unified-detector';
import type { Organization } from '$lib/types';
import type { OrganizationRow } from '$lib/types/supabase';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
	apiVersion: '2026-03-25.dahlia'
});

const SUPPORTED_EVENTS = new Set([
	'invoice.payment_failed',
	'customer.subscription.updated',
	'customer.subscription.paused',
	'customer.subscription.deleted',
	'customer.subscription.trial_will_end'
]);

async function resolveOrgByStripeAccount(accountId: string | null): Promise<OrganizationRow | null> {
	if (!accountId) {
		return null;
	}

	const { data, error } = await admin
		.from('organizations')
		.select('*')
		.contains('providers', [{ type: 'stripe', account_id: accountId }] as never)
		.limit(1)
		.maybeSingle();

	if (error) {
		throw error;
	}

	return (data as unknown as OrganizationRow | null) ?? null;
}

export const POST: RequestHandler = async ({ request }) => {
	const payload = await request.text();
	const signature = request.headers.get('stripe-signature');

	if (!signature) {
		return json({ received: true });
	}

	let event: Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
	} catch {
		log('warn', 'stripe-webhook', 'Invalid signature');
		return json({ received: true });
	}

	if (!SUPPORTED_EVENTS.has(event.type)) {
		return json({ received: true });
	}

	if (!checkRateLimit(`stripe-webhook:${event.id}`, 1, 60_000)) {
		return json({ received: true });
	}

	void (async () => {
		try {
			const organization = await resolveOrgByStripeAccount(event.account ?? null);
			if (!organization) {
				log('warn', 'stripe-webhook', 'No org found for Stripe account', {
					account: event.account ?? null
				});
				return;
			}

			const normalized = normalizeStripeEvent(event as unknown as Record<string, unknown>);
			if (!normalized) {
				return;
			}

			await processNormalizedEvent(normalized, organization as unknown as Organization);
		} catch (caughtError) {
			logError('stripe-webhook', caughtError, { event_id: event.id });
		}
	})();

	return json({ received: true });
};
