import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import Stripe from 'stripe';
import { env } from '$lib/env';
import { logError } from '$lib/server/logger';
import type { Database } from '$lib/types/supabase';

const admin = createClient<Database, 'public'>(env.supabaseUrl, env.supabaseServiceRoleKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false
	}
});

const stripe = new Stripe(env.stripeSecretKey);
const resend = new Resend(env.resendApiKey);

export async function healthCheck(): Promise<{
	status: 'ok' | 'degraded' | 'down';
	checks: {
		supabase: boolean;
		stripe: boolean;
		resend: boolean;
	};
	timestamp: string;
}> {
	const checks = {
		supabase: false,
		stripe: false,
		resend: false
	};

	try {
		const { error } = await admin.from('organizations').select('id').limit(1);
		checks.supabase = !error;
	} catch (error) {
		logError('health.supabase', error);
	}

	try {
		await stripe.customers.list({ limit: 1 });
		checks.stripe = true;
	} catch (error) {
		logError('health.stripe', error);
	}

	try {
		const response = await resend.domains.list();
		checks.resend = !response.error;
	} catch (error) {
		logError('health.resend', error);
	}

	const passed = Object.values(checks).filter(Boolean).length;
	const status = passed === 3 ? 'ok' : passed > 0 ? 'degraded' : 'down';

	return {
		status,
		checks,
		timestamp: new Date().toISOString()
	};
}
