import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { admin } from "$lib/server/admin";
import { logError } from "$lib/server/logger";
import { resolveOrganization } from "$lib/server/organizations";
import { checkRateLimit } from "$lib/server/rate-limiter";
import type { ChurnSignalRow } from "$lib/types/supabase";

export const POST: RequestHandler = async ({ locals }) => {
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

    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await admin
      .from("churn_signals")
      .select("id, status, resolved_at, detected_at")
      .eq("org_id", organization.id)
      .in("status", ["dismissed", "recovered"]);

    if (error) {
      throw error;
    }

    const staleIds = (
      (data ?? []) as Array<
        Pick<ChurnSignalRow, "id" | "resolved_at" | "detected_at">
      >
    )
      .filter((signal) => (signal.resolved_at ?? signal.detected_at) < cutoff)
      .map((signal) => signal.id);

    if (staleIds.length === 0) {
      return json({ dismissed: 0 });
    }

    const { error: updateError } = await admin
      .from("churn_signals")
      .update({
        status: "dismissed",
      } as never)
      .in("id", staleIds)
      .eq("org_id", organization.id);

    if (updateError) {
      throw updateError;
    }

    return json({ dismissed: staleIds.length });
  } catch (error) {
    logError("api.signals.dismiss-all", error, {
      user_id: locals.session.userId,
    });

    return json({ error: "internal_error" }, { status: 500 });
  }
};
