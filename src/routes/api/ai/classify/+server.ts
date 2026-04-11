import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { classifyChurnSignal } from "$lib/server/ai-classifier";
import { toSignal, toSignalStatus, toSignalType } from "$lib/signal-utils";
import type { ChurnSignalRow } from "$lib/types/supabase";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.session?.userId) {
    return json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    signal?: unknown;
  } | null;
  const signal = body?.signal;

  if (
    !isRecord(signal) ||
    typeof signal.id !== "string" ||
    typeof signal.org_id !== "string"
  ) {
    return json({ error: "invalid_signal" }, { status: 400 });
  }

  const normalizedSignal = toSignal({
    id: signal.id,
    org_id: signal.org_id,
    provider: typeof signal.provider === "string" ? signal.provider : "polar",
    polar_customer_id:
      typeof signal.polar_customer_id === "string"
        ? signal.polar_customer_id
        : "",
    customer_email:
      typeof signal.customer_email === "string" ? signal.customer_email : null,
    customer_name:
      typeof signal.customer_name === "string" ? signal.customer_name : null,
    signal_type: toSignalType(
      typeof signal.signal_type === "string"
        ? signal.signal_type
        : "disengaged",
    ),
    mrr_amount: typeof signal.mrr_amount === "number" ? signal.mrr_amount : 0,
    polar_event_id:
      typeof signal.polar_event_id === "string" ? signal.polar_event_id : null,
    status: toSignalStatus(
      typeof signal.status === "string" ? signal.status : "detected",
    ),
    ai_churn_reason:
      typeof signal.ai_churn_reason === "string"
        ? signal.ai_churn_reason
        : null,
    ai_win_back_angle:
      typeof signal.ai_win_back_angle === "string"
        ? signal.ai_win_back_angle
        : null,
    metadata: isRecord(signal.metadata) ? signal.metadata : null,
    detected_at:
      typeof signal.detected_at === "string"
        ? signal.detected_at
        : new Date().toISOString(),
    resolved_at:
      typeof signal.resolved_at === "string" ? signal.resolved_at : null,
  } as unknown as ChurnSignalRow);

  return json(await classifyChurnSignal(normalizedSignal));
};
