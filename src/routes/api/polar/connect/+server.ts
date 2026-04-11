import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { env } from "$lib/env";
import { buildOAuthState, sanitizeNext } from "$lib/server/oauth-state";
import { resolveOrCreateOrganization } from "$lib/server/organizations";

export const GET: RequestHandler = async ({ locals, url }) => {
  const userId = locals.session?.userId;

  if (!userId) {
    const signInUrl = new URL("/sign-in", url.origin);
    signInUrl.searchParams.set("redirectUrl", "/dashboard/settings");
    throw redirect(307, signInUrl.toString());
  }

  const organization = await resolveOrCreateOrganization(locals.session, {
    allowCreate: true,
  });

  if (!organization) {
    throw redirect(303, "/dashboard/settings?error=create_org_first");
  }

  const next = sanitizeNext(url.searchParams.get("next"));
  const redirectUri = new URL(
    "/api/polar/callback",
    env.publicAppUrl,
  ).toString();
  const oauthUrl = new URL("https://polar.sh/oauth2/authorize");
  oauthUrl.searchParams.set("response_type", "code");
  oauthUrl.searchParams.set("client_id", env.polarClientId);
  oauthUrl.searchParams.set("scope", env.polarScopes);
  oauthUrl.searchParams.set("sub_type", "organization");
  oauthUrl.searchParams.set("state", buildOAuthState(organization.id, next));
  oauthUrl.searchParams.set("redirect_uri", redirectUri);

  throw redirect(307, oauthUrl.toString());
};
