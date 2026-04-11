import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  MONITORING_THRESHOLD_RULES,
  type MonitoringThresholdKey,
} from "$lib/constants";
import { admin } from "$lib/server/admin";
import { resolveOrganization } from "$lib/server/organizations";
import type { Json } from "$lib/types/supabase";

type MonitoringThresholds = Partial<Record<MonitoringThresholdKey, number>>;

type OrgMetadata = {
  monitoring_thresholds?: MonitoringThresholds;
  [key: string]: Json | undefined;
};

function parseMetadata(value: Json | null): OrgMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as OrgMetadata;
}

export const POST: RequestHandler = async ({ locals, request }) => {
  const organization = await resolveOrganization(locals.session?.userId);

  if (!organization) {
    return json({ error: "workspace_not_found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as {
    thresholds?: Record<string, number>;
  } | null;

  if (!body?.thresholds || typeof body.thresholds !== "object") {
    return json({ error: "invalid_payload" }, { status: 400 });
  }

  const nextThresholds = {} as Record<MonitoringThresholdKey, number>;

  for (const [key, rule] of Object.entries(
    MONITORING_THRESHOLD_RULES,
  ) as Array<
    [MonitoringThresholdKey, (typeof MONITORING_THRESHOLD_RULES)[MonitoringThresholdKey]]
  >) {
    const value = body.thresholds[key];

    if (typeof value !== "number" || Number.isNaN(value)) {
      return json({ error: "invalid_threshold_value", key }, { status: 400 });
    }

    if (value < rule.min || value > rule.max) {
      return json({ error: "threshold_out_of_range", key }, { status: 400 });
    }

    nextThresholds[key] = Number(value.toFixed(rule.step < 1 ? 2 : 0));
  }

  const metadata = parseMetadata(organization.metadata);
  const { error } = await admin
    .from("organizations")
    .update({
      metadata: {
        ...metadata,
        monitoring_thresholds: nextThresholds,
      } as Json,
    } as never)
    .eq("id", organization.id);

  if (error) {
    return json({ error: "save_failed" }, { status: 500 });
  }

  return json({ saved: true, thresholds: nextThresholds });
};
