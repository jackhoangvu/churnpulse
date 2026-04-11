import { createHmac, timingSafeEqual } from "node:crypto";
import { json } from "@sveltejs/kit";
import { LEMONSQUEEZY_WEBHOOK_SECRET } from "$env/static/private";
import type { RequestHandler } from "./$types";
import { SECURITY_CONFIG } from "$lib/constants";
import { admin } from "$lib/server/admin";
import { log, logError } from "$lib/server/logger";
import { normalizeLemonSqueezyEvent } from "$lib/server/normalizer";
import { checkRateLimit } from "$lib/server/rate-limiter";
import { processNormalizedEvent } from "$lib/server/unified-detector";
import type { Organization } from "$lib/types";
import type { OrganizationRow } from "$lib/types/supabase";

const SUPPORTED_EVENTS = new Set([
  "subscription_payment_failed",
  "subscription_updated",
  "subscription_cancelled",
  "subscription_expired",
]);

function verifyLemonSqueezySignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  try {
    const digest = createHmac("sha256", secret).update(payload).digest("hex");
    return timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(digest, "hex"),
    );
  } catch {
    return false;
  }
}

export const POST: RequestHandler = async ({ request }) => {
  if (
    !LEMONSQUEEZY_WEBHOOK_SECRET ||
    LEMONSQUEEZY_WEBHOOK_SECRET.length <
      SECURITY_CONFIG.MIN_WEBHOOK_SECRET_LENGTH
  ) {
    log("error", "ls-webhook", "LEMONSQUEEZY_WEBHOOK_SECRET not configured");
    return json({ received: true });
  }

  const payload = await request.text();
  const signature = request.headers.get("x-signature") ?? "";

  if (!signature) {
    log("warn", "ls-webhook", "Missing Lemon Squeezy signature header");
    return json({ received: true });
  }

  if (
    !verifyLemonSqueezySignature(
      payload,
      signature,
      LEMONSQUEEZY_WEBHOOK_SECRET,
    )
  ) {
    log("warn", "ls-webhook", "Invalid Lemon Squeezy signature");
    return json({ received: true });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return json({ received: true });
  }

  const meta = ((event.meta as Record<string, unknown>) ?? {}) as Record<
    string,
    unknown
  >;
  const eventName = String(meta.event_name ?? "");
  if (!SUPPORTED_EVENTS.has(eventName)) {
    return json({ received: true });
  }

  const data = ((event.data as Record<string, unknown>) ?? {}) as Record<
    string,
    unknown
  >;
  const eventId = `${eventName}_${String(data.id ?? "")}`;
  if (!(await checkRateLimit(`ls-webhook:${eventId}`, 1, 60_000))) {
    return json({ received: true });
  }

  void (async () => {
    try {
      const customData = ((meta.custom_data as Record<string, unknown>) ??
        {}) as Record<string, unknown>;
      const orgId =
        typeof customData.org_id === "string" ? customData.org_id : "";
      let organization: OrganizationRow | null = null;

      if (orgId) {
        const { data: orgData, error } = await admin
          .from("organizations")
          .select("*")
          .eq("id", orgId)
          .maybeSingle();

        if (error) {
          throw error;
        }

        organization = (orgData as unknown as OrganizationRow | null) ?? null;
      }

      if (!organization) {
        const { data: orgData, error } = await admin
          .from("organizations")
          .select("*")
          .limit(1)
          .maybeSingle();

        if (error) {
          throw error;
        }

        organization = (orgData as unknown as OrganizationRow | null) ?? null;
      }

      if (!organization) {
        return;
      }

      const normalized = normalizeLemonSqueezyEvent(event);
      if (!normalized) {
        return;
      }

      await processNormalizedEvent(
        normalized,
        organization as unknown as Organization,
      );
    } catch (caughtError) {
      logError("ls-webhook", caughtError);
    }
  })();

  return json({ received: true });
};
