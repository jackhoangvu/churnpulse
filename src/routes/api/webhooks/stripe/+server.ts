import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import type { RequestHandler } from './$types';
import { env } from '$lib/env';
import { checkRateLimit } from '$lib/server/rate-limiter';
import { log, logError } from '$lib/server/logger';
import { processStripeEvent, stripeEventAlreadyProcessed } from '$lib/server/stripe-webhook';
import type { Database, OrganizationRow } from '$lib/types/supabase';

const stripe = new Stripe(env.stripeSecretKey);
const admin = createClient<Database, 'public'>(env.supabaseUrl, env.supabaseServiceRoleKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false
	}
});

function extractCandidateAccountId(payload: string): string {
	try {
		const parsed = JSON.parse(payload) as {
			account?: string;
			data?: { object?: { metadata?: { org_id?: string } } };
		};

		return parsed.account ?? parsed.data?.object?.metadata?.org_id ?? 'unknown';
	} catch {
		return 'unknown';
	}
}

async function resolveOrganization(accountId: string): Promise<OrganizationRow | null> {
	if (!accountId || accountId === 'unknown') {
		return null;
	}

	const { data, error } = await admin
		.from('organizations')
		.select('*')
		.eq('stripe_account_id', accountId)
		.maybeSingle();

	if (error) {
		throw error;
	}

	return (data as unknown as OrganizationRow | null) ?? null;
}

export const POST: RequestHandler = async ({ request }) => {
	const payload = await request.text();
	const candidateAccountId = extractCandidateAccountId(payload);
	const signature = request.headers.get('stripe-signature');

	if (!signature) {
		log('warn', 'stripe-webhook', 'Missing Stripe signature header', {
			stripe_account_id: candidateAccountId
		});
		return json({ received: true });
	}

	try {
		const organization = await resolveOrganization(candidateAccountId);

		if (!organization?.stripe_webhook_secret) {
			log('warn', 'stripe-webhook', 'No organization webhook secret found for Stripe event', {
				stripe_account_id: candidateAccountId
			});
			return json({ received: true });
		}

		if (!checkRateLimit(`webhook:${organization.id}`, 100, 60_000)) {
			log('warn', 'stripe-webhook', 'Webhook rate limit exceeded', {
				org_id: organization.id
			});
			return json({ received: true, rate_limited: true });
		}

		const event = stripe.webhooks.constructEvent(payload, signature, organization.stripe_webhook_secret);

		if (await stripeEventAlreadyProcessed(event.id)) {
			log('info', 'stripe-webhook', 'Duplicate webhook skipped before processing', {
				org_id: organization.id,
				stripe_event_id: event.id
			});
			return json({ received: true });
		}

		void (async () => {
			try {
				await processStripeEvent(event);
			} catch (error) {
				logError('stripe-webhook.async', error, {
					org_id: organization.id,
					stripe_event_id: event.id
				});
			}
		})();
	} catch (error) {
		logError('stripe-webhook', error, {
			stripe_account_id: candidateAccountId
		});
	}

	return json({ received: true });
};
