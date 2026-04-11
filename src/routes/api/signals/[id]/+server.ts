import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { admin } from "$lib/server/admin";
import { logError } from "$lib/server/logger";
import { resolveOrganization } from "$lib/server/organizations";
import { checkRateLimit } from "$lib/server/rate-limiter";
import { toSignal } from "$lib/signal-utils";
import type { ChurnSignalRow, SequenceEmailRow } from "$lib/types/supabase";

type UpdateAction = "mark_recovered" | "dismiss";

async function loadSignalWithEmails(signalId: string, orgId: string) {
  const [
    { data: signal, error: signalError },
    { data: emails, error: emailError },
  ] = await Promise.all([
    admin
      .from("churn_signals")
      .select("*")
      .eq("id", signalId)
      .eq("org_id", orgId)
      .maybeSingle(),
    admin
      .from("sequence_emails")
      .select("*")
      .eq("signal_id", signalId)
      .eq("org_id", orgId)
      .order("step", { ascending: true }),
  ]);

  if (signalError) {
    throw signalError;
  }

  if (emailError) {
    throw emailError;
  }

  return {
    signal: signal ? toSignal(signal as unknown as ChurnSignalRow) : null,
    sequence_emails: (emails ?? []) as unknown as SequenceEmailRow[],
  };
}

export const GET: RequestHandler = async ({ locals, params }) => {
  if (!locals.session?.userId) {
    return json({ error: "unauthorized" }, { status: 401 });
  }

  if (!(await checkRateLimit(`api:${locals.session.userId}`, 60, 60_000))) {
    return json({ error: "rate_limited" }, { status: 429 });
  }

  try {
    const organization = await resolveOrganization(locals.session.userId);

    if (!organization) {
      return json({ error: "workspace_not_found" }, { status: 404 });
    }

    const payload = await loadSignalWithEmails(params.id, organization.id);

    if (!payload.signal) {
      return json({ error: "signal_not_found" }, { status: 404 });
    }

    return json(payload);
  } catch (error) {
    logError("api.signals.detail", error, {
      user_id: locals.session.userId,
      signal_id: params.id,
    });

    return json({ error: "internal_error" }, { status: 500 });
  }
};

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
  if (!locals.session?.userId) {
    return json({ error: "unauthorized" }, { status: 401 });
  }

  if (!(await checkRateLimit(`api:${locals.session.userId}`, 60, 60_000))) {
    return json({ error: "rate_limited" }, { status: 429 });
  }

  try {
    const organization = await resolveOrganization(locals.session.userId);

    if (!organization) {
      return json({ error: "workspace_not_found" }, { status: 404 });
    }

    const body = (await request.json().catch(() => null)) as {
      action?: UpdateAction;
    } | null;
    const action = body?.action;

    if (action !== "mark_recovered" && action !== "dismiss") {
      return json({ error: "invalid_action" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("churn_signals")
      .update({
        status: action === "mark_recovered" ? "recovered" : "dismissed",
        resolved_at: new Date().toISOString(),
      } as never)
      .eq("id", params.id)
      .eq("org_id", organization.id)
      .select("*")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return json({ error: "signal_not_found" }, { status: 404 });
    }

    return json({
      signal: toSignal(data as unknown as ChurnSignalRow),
    });
  } catch (error) {
    logError("api.signals.update", error, {
      user_id: locals.session.userId,
      signal_id: params.id,
    });

    return json({ error: "internal_error" }, { status: 500 });
  }
};
