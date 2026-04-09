import { createClient } from '@supabase/supabase-js';
import { json } from '@sveltejs/kit';
import type Stripe from 'stripe';
import type { RequestHandler } from './$types';
import { env } from '$lib/env';
import { handleApiError } from '$lib/server/error-handler';
import { checkRateLimit } from '$lib/server/rate-limiter';
import { log, logError } from '$lib/server/logger';
import { toOrganizationUserId } from '$lib/server/organizations';
import { processStripeEvent } from '$lib/server/stripe-webhook';
import type { Database, OrganizationRow } from '$lib/types/supabase';

const admin = createClient<Database, 'public'>(env.supabaseUrl, env.supabaseServiceRoleKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false
	}
});

async function resolveOrganization(orgId?: string): Promise<OrganizationRow | null> {
	if (orgId) {
		const { data } = await admin.from('organizations').select('*').eq('id', orgId).maybeSingle();
		return data as unknown as OrganizationRow | null;
	}

	const { data } = await admin
		.from('organizations')
		.select('*')
		.order('created_at', { ascending: true })
		.limit(1)
		.maybeSingle();

	return data as unknown as OrganizationRow | null;
}

function buildTestEvent(eventType: string, org: OrganizationRow): Stripe.Event {
	const base = {
		id: `evt_test_${crypto.randomUUID().replaceAll('-', '')}`,
		object: 'event',
		account: org.stripe_account_id ?? undefined,
		api_version: '2025-09-30.clover',
		created: Math.floor(Date.now() / 1000),
		livemode: false,
		pending_webhooks: 0,
		request: {
			id: null,
			idempotency_key: null
		}
	};

	if (eventType === 'invoice.payment_failed') {
		return {
			...base,
			type: eventType,
			data: {
				object: {
					id: `in_test_${crypto.randomUUID().slice(0, 8)}`,
					object: 'invoice',
					customer: 'cus_test_failed',
					customer_email: 'test@example.com',
					amount_due: 9900,
					metadata: {
						org_id: org.id,
						customer_name: 'Test Customer',
						customer_email: 'test@example.com'
					}
				}
			}
		} as unknown as Stripe.Event;
	}

	if (eventType === 'customer.subscription.updated') {
		return {
			...base,
			type: eventType,
			data: {
				object: {
					id: `sub_test_${crypto.randomUUID().slice(0, 8)}`,
					object: 'subscription',
					customer: 'cus_test_downgrade',
					items: {
						data: [{ quantity: 1, price: { unit_amount: 4900 } }]
					},
					metadata: {
						org_id: org.id,
						customer_name: 'Test Customer',
						customer_email: 'test@example.com'
					}
				},
				previous_attributes: {
					items: {
						data: [{ price: { unit_amount: 9900 } }]
					}
				}
			}
		} as unknown as Stripe.Event;
	}

	if (eventType === 'customer.subscription.deleted') {
		return {
			...base,
			type: eventType,
			data: {
				object: {
					id: `sub_test_${crypto.randomUUID().slice(0, 8)}`,
					object: 'subscription',
					customer: 'cus_test_cancelled',
					items: {
						data: [{ quantity: 1, price: { unit_amount: 9900 } }]
					},
					metadata: {
						org_id: org.id,
						customer_name: 'Test Customer',
						customer_email: 'test@example.com'
					}
				}
			}
		} as unknown as Stripe.Event;
	}

	throw new Error('Unsupported test event type');
}

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	try {
		const body = (await request.json()) as { event_type?: string; org_id?: string };
		const isDevelopment = env.nodeEnv !== 'production';
		const organization = await resolveOrganization(body.org_id);

		if (!organization) {
			return handleApiError(new Error('No organization found for webhook test.'));
		}

		if (!isDevelopment) {
			if (
				!locals.session?.userId ||
				toOrganizationUserId(locals.session.userId) !== organization.user_id
			) {
				return handleApiError({
					status: 401,
					code: 'unauthorized'
				});
			}
		}

		const limiterKey = locals.session?.userId
			? `api:${locals.session.userId}`
			: `api:${getClientAddress()}`;

		if (!checkRateLimit(limiterKey, 60, 60_000)) {
			return json(
				{
					error: 'rate_limited',
					message: 'Too many test webhook requests. Please wait a minute and try again.'
				},
				{ status: 429 }
			);
		}

		if (
			body.event_type !== 'invoice.payment_failed' &&
			body.event_type !== 'customer.subscription.updated' &&
			body.event_type !== 'customer.subscription.deleted'
		) {
			return json(
				{
					error: 'invalid_event_type',
					message: 'Unsupported test event type.'
				},
				{ status: 400 }
			);
		}

		const event = buildTestEvent(body.event_type, organization);
		const result = await processStripeEvent(event);

		log('info', 'test-webhook', 'Generated test webhook event', {
			org_id: organization.id,
			event_type: body.event_type,
			signal_created: result.signal_created,
			sequence_scheduled: result.sequence_scheduled
		});

		return json({
			event_generated: result.event_generated,
			signal_created: result.signal_created,
			sequence_scheduled: result.sequence_scheduled
		});
	} catch (error) {
		logError('test-webhook', error);
		return handleApiError(error);
	}
};
