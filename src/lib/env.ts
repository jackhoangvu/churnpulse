import {
	ANTHROPIC_API_KEY,
	CLERK_SECRET_KEY,
	RESEND_API_KEY,
	STRIPE_SECRET_KEY,
	SUPABASE_SERVICE_ROLE_KEY
} from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

export const env = {
	anthropicApiKey: ANTHROPIC_API_KEY,
	clerkSecretKey: CLERK_SECRET_KEY,
	nodeEnv: process.env.NODE_ENV ?? 'development',
	publicAppUrl: process.env.PUBLIC_APP_URL ?? 'http://localhost:5173',
	resendApiKey: RESEND_API_KEY,
	stripeConnectScope: process.env.STRIPE_CONNECT_SCOPE ?? 'read_write',
	stripeSecretKey: STRIPE_SECRET_KEY,
	supabaseServiceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
	supabaseUrl: PUBLIC_SUPABASE_URL
} as const;
