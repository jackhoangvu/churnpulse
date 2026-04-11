import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { organizationHasActiveProvider } from "$lib/provider-utils";
import { admin } from "$lib/server/admin";
import { loadDashboardStats } from "$lib/server/dashboard-stats";
import { resolveOrganization } from "$lib/server/organizations";

export const load: PageServerLoad = async ({ locals, setHeaders }) => {
  const now = new Date();
  setHeaders({
    "cache-control": "private, max-age=60, stale-while-revalidate=300",
  });

  try {
    const organization = await resolveOrganization(locals.session?.userId);

    if (
      !organization ||
      (!organization.polar_organization_id &&
        !organizationHasActiveProvider(organization.providers))
    ) {
      return {
        title: "Dashboard",
        breadcrumb: ["ChurnPulse", "Dashboard"],
        nowIso: now.toISOString(),
        connected: false,
        stats: null,
      };
    }

    return {
      title: "Dashboard",
      breadcrumb: ["ChurnPulse", "Dashboard"],
      nowIso: now.toISOString(),
      connected: true,
      stats: await loadDashboardStats(organization.id, now),
    };
  } catch (error) {
    console.error("dashboard.load_failed", error);

    return {
      title: "Dashboard",
      breadcrumb: ["ChurnPulse", "Dashboard"],
      nowIso: now.toISOString(),
      connected: false,
      stats: null,
    };
  }
};

export const actions: Actions = {
  dismiss: async ({ request, locals }) => {
    const signalId = request
      .formData()
      .then((formData) => formData.get("signalId"));
    const organization = await resolveOrganization(locals.session?.userId);
    const resolvedSignalId = await signalId;

    if (
      !organization ||
      (!organization.polar_organization_id &&
        !organizationHasActiveProvider(organization.providers))
    ) {
      return fail(404, {
        message: "No connected Polar workspace was found for this account.",
      });
    }

    if (typeof resolvedSignalId !== "string" || !resolvedSignalId.trim()) {
      return fail(400, {
        message: "The requested signal could not be dismissed.",
      });
    }

    const { error } = await admin
      .from("churn_signals")
      .update({
        status: "dismissed",
        resolved_at: new Date().toISOString(),
      } as never)
      .eq("id", resolvedSignalId)
      .eq("org_id", organization.id);

    if (error) {
      return fail(500, {
        message: "We could not dismiss that signal just now.",
      });
    }

    return { success: true };
  },
};
