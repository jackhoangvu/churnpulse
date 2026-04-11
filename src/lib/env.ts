// src/lib/env.ts
import { config } from "dotenv";
import { join } from "path";

// Manually load .env file from the project root
config({ path: join(process.cwd(), ".env") });

export const env = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
  clerkSecretKey: process.env.CLERK_SECRET_KEY!,
  polarClientId: process.env.POLAR_CLIENT_ID ?? "",
  polarClientSecret: process.env.POLAR_CLIENT_SECRET ?? "",
  polarScopes:
    process.env.POLAR_SCOPES ??
    "openid email organizations:read customers:read subscriptions:read orders:read webhooks:write customer_sessions:write",
  polarServer: process.env.POLAR_SERVER ?? "sandbox",
  resendApiKey: process.env.RESEND_API_KEY!,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,

  // This was likely undefined before, causing the Supabase error
  supabaseUrl: process.env.PUBLIC_SUPABASE_URL!,

  enableTestWebhooks: process.env.ENABLE_TEST_WEBHOOKS === "true",
  nodeEnv: process.env.NODE_ENV ?? "development",
  oauthStateSecret: process.env.OAUTH_STATE_SECRET ?? "",
  publicAppUrl: process.env.PUBLIC_APP_URL ?? "http://localhost:5173",
  stripeConnectScope:
    process.env.STRIPE_CONNECT_SCOPE === "read_write"
      ? "read_write"
      : "read_write",
  tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY ?? "",
} as const;
