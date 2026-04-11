import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { admin } from "$lib/server/admin";
import {
  normalizeLemonSqueezyEvent,
  normalizePaddleEvent,
  normalizePolarEvent,
  normalizeStripeEvent,
} from "$lib/server/normalizer";
import { resolveOrganization } from "$lib/server/organizations";
import { processNormalizedEvent } from "$lib/server/unified-detector";
import type { Organization, Provider } from "$lib/types";
import type {
  OrganizationRow,
  ProviderEventRow,
} from "$lib/types/supabase";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeStoredEvent(event: ProviderEventRow) {
  const payload = isRecord(event.payload) ? event.payload : null;

  if (!payload) {
    return null;
  }

  const normalizers: Record<
    Provider,
    (value: Record<string, unknown>) => ReturnType<typeof normalizeStripeEvent>
  > = {
    stripe: normalizeStripeEvent,
    paddle: normalizePaddleEvent,
    lemonsqueezy: normalizeLemonSqueezyEvent,
    polar: normalizePolarEvent,
  };

  return normalizers[event.provider](payload);
}

async function loadOrganization(orgId: string): Promise<OrganizationRow | null> {
  const { data, error } = await admin
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as unknown as OrganizationRow | null) ?? null;
}

export const POST: RequestHandler = async ({ locals, request }) => {
  const organization = await resolveOrganization(locals.session?.userId);
  const body = (await request.json().catch(() => null)) as
    | {
        event_id?: string;
      }
    | null;
  const eventId = body?.event_id?.trim();

  if (!organization) {
    return json({ error: "workspace_not_found" }, { status: 404 });
  }

  if (!eventId) {
    return json({ error: "missing_event_id" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("provider_events")
    .select("*")
    .eq("id", eventId)
    .eq("org_id", organization.id)
    .maybeSingle();

  if (error) {
    return json({ error: "load_failed" }, { status: 500 });
  }

  const providerEvent = (data as unknown as ProviderEventRow | null) ?? null;

  if (!providerEvent) {
    return json({ error: "not_found" }, { status: 404 });
  }

  const normalized = normalizeStoredEvent(providerEvent);

  if (!normalized) {
    await admin
      .from("provider_events")
      .update({
        processed: false,
        error_message: "Stored payload could not be normalized for retry.",
      } as never)
      .eq("id", providerEvent.id)
      .eq("org_id", organization.id);

    return json({ error: "normalization_failed" }, { status: 400 });
  }

  try {
    const org = await loadOrganization(providerEvent.org_id);

    if (!org) {
      return json({ error: "workspace_not_found" }, { status: 404 });
    }

    await processNormalizedEvent(normalized, org as unknown as Organization);

    await admin
      .from("provider_events")
      .update({
        processed: true,
        error_message: null,
      } as never)
      .eq("id", providerEvent.id)
      .eq("org_id", organization.id);

    return json({ retried: true, id: providerEvent.id });
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : "Retry failed";

    await admin
      .from("provider_events")
      .update({
        processed: false,
        error_message: message,
      } as never)
      .eq("id", providerEvent.id)
      .eq("org_id", organization.id);

    return json({ error: "retry_failed", message }, { status: 500 });
  }
};
