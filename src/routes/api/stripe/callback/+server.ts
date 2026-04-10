import { redirect } from '@sveltejs/kit';
import Stripe from 'stripe';
import { STRIPE_CLIENT_ID, STRIPE_SECRET_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';
import { upsertProviderConnection } from '$lib/provider-utils';
import { env } from '$lib/env';
import { admin } from '$lib/server/admin';
import { logError } from '$lib/server/logger';
import type { Json, OrganizationRow } from '$lib/types/supabase';

const stripe = new Stripe(STRIPE_SECRET_KEY);

type OAuthResponse = {
	access_token: string;
	refresh_token: string;
	stripe_user_id: string;
};

type OAuthState = {
	orgId: string;
	next: string;
};

function parseState(state: string | null): OAuthState | null {
	if (!state) {
		return null;
	}

	try {
		const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as {
			orgId?: string;
			next?: string;
		};

		if (
			typeof decoded.orgId !== 'string' ||
			typeof decoded.next !== 'string' ||
			!decoded.next.startsWith('/dashboard')
		) {
			return null;
		}

		return {
			orgId: decoded.orgId,
			next: decoded.next
		};
	} catch {
		return null;
	}
}

function errorRedirect(code: string, next = '/dashboard'): never {
	throw redirect(303, `${next}?error=${code}`);
}

function mergeMetadata(existing: Json | null): Record<string, Json | undefined> {
	if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
		return existing as Record<string, Json | undefined>;
	}

	return {};
}

export const GET: RequestHandler = async ({ url }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const error = url.searchParams.get('error');
	const parsedState = parseState(state);
	const nextPath = parsedState?.next ?? '/dashboard';
	const orgId = parsedState?.orgId ?? null;

	if (error) {
		errorRedirect('access_denied', nextPath);
	}

	if (!code || !orgId) {
		errorRedirect('missing_code', nextPath);
	}

	try {
		const redirectUri = new URL('/api/stripe/callback', env.publicAppUrl).toString();
		const body = new URLSearchParams({
			client_secret: STRIPE_SECRET_KEY,
			client_id: STRIPE_CLIENT_ID,
			code,
			grant_type: 'authorization_code',
			redirect_uri: redirectUri
		});

		const response = await fetch('https://connect.stripe.com/oauth/token', {
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded'
			},
			body
		});

		if (!response.ok) {
			errorRedirect('token_exchange_failed', nextPath);
		}

		const tokens = (await response.json()) as Partial<OAuthResponse> & { error?: string };
		if (!tokens.access_token || !tokens.refresh_token || !tokens.stripe_user_id || tokens.error) {
			errorRedirect('token_exchange_failed', nextPath);
		}

		const webhook = await stripe.webhookEndpoints.create(
			{
				url: new URL('/api/webhooks/stripe', env.publicAppUrl).toString(),
				enabled_events: [
					'invoice.payment_failed',
					'customer.subscription.updated',
					'customer.subscription.paused',
					'customer.subscription.deleted',
					'customer.subscription.trial_will_end'
				]
			},
			{
				stripeAccount: tokens.stripe_user_id
			}
		);

		if (!webhook.secret) {
			errorRedirect('webhook_secret_missing', nextPath);
		}

		const { data: existingOrg, error: selectError } = await admin
			.from('organizations')
			.select('*')
			.eq('id', orgId)
			.maybeSingle();

		if (selectError) {
			throw selectError;
		}

		const organization = existingOrg as unknown as OrganizationRow | null;
		const providers = upsertProviderConnection(organization?.providers ?? null, {
			type: 'stripe',
			account_id: tokens.stripe_user_id,
			access_token: tokens.access_token,
			refresh_token: tokens.refresh_token,
			webhook_secret: webhook.secret,
			connected_at: new Date().toISOString(),
			status: 'active'
		});

		const { error: updateError } = await admin
			.from('organizations')
			.update({
				metadata: {
					...mergeMetadata(organization?.metadata ?? null),
					stripe_connected_at: new Date().toISOString()
				} as Json,
				providers: providers as unknown as Json
			} as never)
			.eq('id', orgId);

		if (updateError) {
			throw updateError;
		}
	} catch (caughtError) {
		logError('stripe.callback', caughtError, { org_id: orgId });
		errorRedirect('connect_failed', nextPath);
	}

	throw redirect(303, `${nextPath}?connected=true`);
};
