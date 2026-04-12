import { isRedirect, redirect } from "@sveltejs/kit";
import { Polar } from "@polar-sh/sdk";
import type { RequestHandler } from "./$types";
import {
  getPolarWebhookSecret,
  upsertProviderConnection,
} from "$lib/provider-utils";
import { env } from "$lib/env";
import { admin } from "$lib/server/admin";
import { encryptToken } from "$lib/server/crypto";
import { logError } from "$lib/server/logger";
import { parseOAuthState } from "$lib/server/oauth-state";
import type { Json, OrganizationRow, ProviderConnection } from "$lib/types/supabase";

type OAuthState = {
  orgId: string;
  next: string;
};

type PolarTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  expires_in?: number;
};

function errorRedirect(code: string, next = "/dashboard"): never {
  throw redirect(303, `${next}?error=${code}`);
}

function mergeMetadata(
  existing: Json | null,
): Record<string, Json | undefined> {
  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    return existing as Record<string, Json | undefined>;
  }

  return {};
}

function getPolarOauthApiBaseUrl(): string {
  return "https://api.polar.sh";
}

async function fetchPolarOrganizationId(
  accessToken: string,
): Promise<{ id: string; label: string | null } | null> {
  const polar = new Polar({
    accessToken,
    serverURL: getPolarOauthApiBaseUrl(),
  });
  const info = await polar.oauth2.userinfo();
  const id = typeof info.sub === "string" ? info.sub : "";

  if (!id) {
    return null;
  }

  const label =
    "name" in info && typeof info.name === "string" && info.name.trim()
      ? info.name
      : null;

  return { id, label };
}

export const GET: RequestHandler = async ({ url }) => {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const parsedState = parseOAuthState(state) as OAuthState | null;
  const nextPath = parsedState?.next ?? "/dashboard";
  const orgId = parsedState?.orgId ?? null;

  if (error) {
    errorRedirect("access_denied", nextPath);
  }

  if (!code || !orgId) {
    errorRedirect("missing_code", nextPath);
  }

  try {
    const redirectUri = new URL(
      "/api/polar/callback",
      env.publicAppUrl,
    ).toString();
    const body = new URLSearchParams({
      client_id: env.polarClientId,
      client_secret: env.polarClientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    });

    const response = await fetch(`${getPolarOauthApiBaseUrl()}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
      },
      body,
    });

    if (!response.ok) {
      errorRedirect("token_exchange_failed", nextPath);
    }

    const tokens = (await response.json()) as PolarTokenResponse;
    if (!tokens.access_token) {
      errorRedirect("token_exchange_failed", nextPath);
    }

    const resolvedOrganization = await fetchPolarOrganizationId(
      tokens.access_token,
    );
    if (!resolvedOrganization) {
      errorRedirect("organization_lookup_failed", nextPath);
    }

    const { data: existingOrg, error: selectError } = await admin
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .maybeSingle();

    if (selectError) {
      throw selectError;
    }

    const organization = existingOrg as unknown as OrganizationRow | null;
    const encryptedAccessToken = encryptToken(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? encryptToken(tokens.refresh_token)
      : null;
    const connection: ProviderConnection = {
      type: "polar" as const,
      account_id: resolvedOrganization.id,
      access_token: encryptedAccessToken,
      webhook_secret: organization ? getPolarWebhookSecret(organization) ?? "" : "",
      connected_at: new Date().toISOString(),
      status: "active" as const,
    };

    if (encryptedRefreshToken) {
      connection.refresh_token = encryptedRefreshToken;
    }

    if (resolvedOrganization.label) {
      connection.label = resolvedOrganization.label;
    }

    const providers = upsertProviderConnection(
      organization?.providers ?? null,
      connection,
    );

    const { error: updateError } = await admin
      .from("organizations")
      .update({
        metadata: {
          ...mergeMetadata(organization?.metadata ?? null),
          polar_connected_at: new Date().toISOString(),
        } as Json,
        providers: providers as unknown as Json,
      } as never)
      .eq("id", orgId);

    if (updateError) {
      throw updateError;
    }
  } catch (caughtError) {
    if (isRedirect(caughtError)) {
      throw caughtError;
    }

    logError("polar.callback", caughtError, { org_id: orgId });
    errorRedirect("connect_failed", nextPath);
  }

  throw redirect(303, `${nextPath}?connected=true`);
};
