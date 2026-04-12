import { json } from "@sveltejs/kit";
import Stripe from "stripe";
import type { RequestHandler } from "./$types";
import { env } from "$lib/env";
import {
  getPolarAccountId,
  getPolarWebhookSecret,
} from "$lib/provider-utils";
import { admin } from "$lib/server/admin";
import { log, logError } from "$lib/server/logger";
import { checkRateLimit } from "$lib/server/rate-limiter";
import {
  polarEventAlreadyProcessed,
  processPolarEvent,
} from "$lib/server/polar-webhook";
import type { OrganizationRow } from "$lib/types/supabase";

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

    return parsed.account ?? parsed.data?.object?.metadata?.org_id ?? "unknown";
  } catch {
    return "unknown";
  }
}

async function resolveOrganization(
  accountId: string,
): Promise<OrganizationRow | null> {
  if (!accountId || accountId === "unknown") {
    return null;
  }

  const { data, error } = await admin
    .from("organizations")
    .select("*")
    .not("providers", "is", null);

  if (error) {
    throw error;
  }

  const organizations = (data as unknown as OrganizationRow[] | null) ?? [];
  return organizations.find((organization) => getPolarAccountId(organization) === accountId) ?? null;
}

export const POST: RequestHandler = async ({ request }) => {
  const payload = await request.text();
  const candidateAccountId = extractCandidateAccountId(payload);
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    log("warn", "polar-webhook", "Missing Polar signature header", {
      polar_account_id: candidateAccountId,
    });
    return json({ received: true });
  }

  try {
    const organization = await resolveOrganization(candidateAccountId);
    const webhookSecret = organization ? getPolarWebhookSecret(organization) : null;
    if (!organization || !webhookSecret) {
      log(
        "warn",
        "polar-webhook",
        "No organization webhook secret found for Polar event",
        {
          polar_account_id: candidateAccountId,
        },
      );
      return json({ received: true });
    }

    if (!(await checkRateLimit(`webhook:${organization.id}`, 100, 60_000))) {
      log("warn", "polar-webhook", "Webhook rate limit exceeded", {
        org_id: organization.id,
      });
      return json({ received: true, rate_limited: true });
    }

    const event = polar.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );

    if (await polarEventAlreadyProcessed(event.id)) {
      log(
        "info",
        "polar-webhook",
        "Duplicate webhook skipped before processing",
        {
          org_id: organization.id,
          polar_event_id: event.id,
        },
      );
      return json({ received: true });
    }

    void (async () => {
      try {
        await processPolarEvent(event);
      } catch (caughtError) {
        logError("polar-webhook.async", caughtError, {
          org_id: organization.id,
          polar_event_id: event.id,
        });
      }
    })();
  } catch (caughtError) {
    logError("polar-webhook", caughtError, {
      polar_account_id: candidateAccountId,
    });
  }

  return json({ received: true });
};
