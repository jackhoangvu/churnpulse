import { redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { STRIPE_CLIENT_ID, STRIPE_SECRET_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';
import { env } from '$lib/env';
import { logError } from '$lib/server/logger';
import type { Database, Json, OrganizationRow } from '$lib/types/supabase';

const admin = createClient<Database, 'public'>(env.supabaseUrl, env.supabaseServiceRoleKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false
	}
});

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
					'customer.subscription.trial_will_end',
					'customer.updated'
				]
			},
			{
				stripeAccount: tokens.stripe_user_id
			}
		);

		const { data: existingOrg } = await admin
			.from('organizations')
			.select('*')
			.eq('id', orgId)
			.maybeSingle();
		const orgRow = existingOrg as unknown as OrganizationRow | null;
		const existingMetadata =
			orgRow && typeof orgRow.metadata === 'object' && orgRow.metadata !== null
				? (orgRow.metadata as Record<string, Json | undefined>)
				: {};

		const { error: updateError } = await admin
			.from('organizations')
			.update({
				metadata: {
					...existingMetadata,
					stripe_connected_at: new Date().toISOString()
				} as Json,
				stripe_account_id: tokens.stripe_user_id,
				stripe_access_token: tokens.access_token,
				stripe_refresh_token: tokens.refresh_token,
				stripe_webhook_secret: webhook.secret
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
