import { json } from '@sveltejs/kit';
import Stripe from 'stripe';
import type { RequestHandler } from './$types';
import { env } from '$lib/env';
import { admin } from '$lib/server/admin';
import { log, logError } from '$lib/server/logger';
import { checkRateLimit } from '$lib/server/rate-limiter';
import { polarEventAlreadyProcessed, processPolarEvent } from '$lib/server/polar-webhook';
import type { OrganizationRow } from '$lib/types/supabase';

const polar = new Stripe(env.stripeSecretKey);

function extractCandidateAccountId(payload: string): string {
	try {
		const parsed = JSON.parse(payload) as {
			account?: string;
			data?: {
				object?: {
					metadata?: {
						org_id?: string;
					};
				};
			};
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
		.eq('polar_account_id', accountId)
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
		log('warn', 'polar-webhook', 'Missing Polar signature header', {
			polar_account_id: candidateAccountId
		});
		return json({ received: true });
	}

	try {
		const organization = await resolveOrganization(candidateAccountId);
		if (!organization?.polar_webhook_secret) {
			log('warn', 'polar-webhook', 'No organization webhook secret found for Polar event', {
				polar_account_id: candidateAccountId
			});
			return json({ received: true });
		}

		if (!checkRateLimit(`webhook:${organization.id}`, 100, 60_000)) {
			log('warn', 'polar-webhook', 'Webhook rate limit exceeded', {
				org_id: organization.id
			});
			return json({ received: true, rate_limited: true });
		}

		const event = polar.webhooks.constructEvent(
			payload,
			signature,
			organization.polar_webhook_secret
		);

		if (await polarEventAlreadyProcessed(event.id)) {
			log('info', 'polar-webhook', 'Duplicate webhook skipped before processing', {
				org_id: organization.id,
				polar_event_id: event.id
			});
			return json({ received: true });
		}

		void (async () => {
			try {
				await processPolarEvent(event);
			} catch (caughtError) {
				logError('polar-webhook.async', caughtError, {
					org_id: organization.id,
					polar_event_id: event.id
				});
			}
		})();
	} catch (caughtError) {
		logError('polar-webhook', caughtError, {
			polar_account_id: candidateAccountId
		});
	}

	return json({ received: true });
};
