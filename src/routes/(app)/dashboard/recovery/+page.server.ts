import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { CHURN_THRESHOLDS, PAGINATION } from "$lib/constants";
import { admin } from "$lib/server/admin";
import { resolveOrganization } from "$lib/server/organizations";
import { toSignal } from "$lib/signal-utils";
import {
  toRecoveryCustomer,
  type RecoveryCustomerRow,
} from "$lib/recovery-utils";
import { organizationHasActiveProvider } from "$lib/provider-utils";
import type { ChurnSignalRow } from "$lib/types/supabase";

function isConnectedOrg(
  org: Awaited<ReturnType<typeof resolveOrganization>>,
): boolean {
  return Boolean(
    org &&
    (org.polar_account_id ||
      org.polar_organization_id ||
      organizationHasActiveProvider(org.providers)),
  );
}

type RecoveryFilter = "all" | "payment" | "cancel" | "high-value";

function parseFilter(value: string | null): RecoveryFilter {
  return value === "payment" || value === "cancel" || value === "high-value"
    ? value
    : "all";
}

export const load: PageServerLoad = async ({ locals, url }) => {
  const now = new Date();
  const org = await resolveOrganization(locals.session?.userId);
  const connected = isConnectedOrg(org);
  const filter = parseFilter(url.searchParams.get("filter"));
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));

  if (!org || !connected) {
    return {
      title: "Recovery Center",
      breadcrumb: ["ChurnPulse", "Recovery Center"],
      nowIso: now.toISOString(),
      month: now.toLocaleString("en-US", { month: "long" }),
      connected: false,
      customers: [] as RecoveryCustomerRow[],
      totals: {
        payment: 0,
        cancel: 0,
        highValue: 0,
        paymentMrr: 0,
        cancelMrr: 0,
        highMrr: 0,
      },
      accuracy: {
        spotting: 87.8,
        earlyWarning: 4.5,
        churnRate: 4.8,
      },
      pagination: {
        page,
        perPage: PAGINATION.RECOVERY_PER_PAGE,
        total: 0,
      },
    };
  }

  const since = new Date(now);
  since.setDate(now.getDate() - 30);

  let query = admin
    .from("churn_signals")
    .select("*", { count: "exact" })
    .eq("org_id", org.id)
    .not("status", "in", '("dismissed","recovered","churned")')
    .gte("detected_at", since.toISOString())
    .order("mrr_amount", { ascending: false });

  if (filter === "payment") {
    query = query.eq("signal_type", "card_failed");
  }

  if (filter === "cancel") {
    query = query.in("signal_type", ["cancelled", "high_mrr_risk"]);
  }

  if (filter === "high-value") {
    query = query.gt("mrr_amount", CHURN_THRESHOLDS.HIGH_MRR_CENTS);
  }

  const from = (page - 1) * PAGINATION.RECOVERY_PER_PAGE;
  const to = from + PAGINATION.RECOVERY_PER_PAGE - 1;
  const { data, error, count } = await query.range(from, to);

  if (error) {
    throw error;
  }

  const customers = ((data ?? []) as unknown as ChurnSignalRow[])
    .map((row) => toRecoveryCustomer(toSignal(row)))
    .sort((left, right) => right.riskScore - left.riskScore);
  const paymentCustomers = customers.filter(
    (customer) => customer.driver === "payment",
  );
  const cancelCustomers = customers.filter(
    (customer) => customer.driver === "cancel",
  );
  const highValueCustomers = customers.filter(
    (customer) => customer.signal.mrr_amount > 50_000,
  );

  return {
    title: "Recovery Center",
    breadcrumb: ["ChurnPulse", "Recovery Center"],
    nowIso: now.toISOString(),
    month: now.toLocaleString("en-US", { month: "long" }),
    connected: true,
    customers,
    totals: {
      payment: paymentCustomers.length,
      cancel: cancelCustomers.length,
      highValue: highValueCustomers.length,
      paymentMrr: paymentCustomers.reduce(
        (sum, customer) => sum + customer.signal.mrr_amount,
        0,
      ),
      cancelMrr: cancelCustomers.reduce(
        (sum, customer) => sum + customer.signal.mrr_amount,
        0,
      ),
      highMrr: highValueCustomers.reduce(
        (sum, customer) => sum + customer.signal.mrr_amount,
        0,
      ),
    },
    accuracy: {
      spotting: 87.8,
      earlyWarning: 4.5,
      churnRate: 4.8,
    },
    pagination: {
      page,
      perPage: PAGINATION.RECOVERY_PER_PAGE,
      total: count ?? customers.length,
    },
  };
};

export const actions: Actions = {
  markRecovered: async ({ request, locals }) => {
    const org = await resolveOrganization(locals.session?.userId);
    const formData = await request.formData();
    const signalId = formData.get("signalId");

    if (!org || typeof signalId !== "string") {
      return fail(400, { message: "Invalid request." });
    }

    const { error } = await admin
      .from("churn_signals")
      .update({
        status: "recovered",
        resolved_at: new Date().toISOString(),
      } as never)
      .eq("id", signalId)
      .eq("org_id", org.id);

    if (error) {
      return fail(500, { message: "Could not mark as recovered." });
    }

    return { message: "Customer marked as recovered." };
  },
  dismiss: async ({ request, locals }) => {
    const org = await resolveOrganization(locals.session?.userId);
    const formData = await request.formData();
    const signalId = formData.get("signalId");

    if (!org || typeof signalId !== "string") {
      return fail(400, { message: "Invalid request." });
    }

    const { error } = await admin
      .from("churn_signals")
      .update({
        status: "dismissed",
        resolved_at: new Date().toISOString(),
      } as never)
      .eq("id", signalId)
      .eq("org_id", org.id);

    if (error) {
      return fail(500, { message: "Could not dismiss signal." });
    }

    return { message: "Signal dismissed." };
  },
};
