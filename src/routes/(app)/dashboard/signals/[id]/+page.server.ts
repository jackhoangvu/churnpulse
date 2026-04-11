import { error, fail } from "@sveltejs/kit";
import Stripe from "stripe";
import type { Actions, PageServerLoad } from "./$types";
import { CHURN_THRESHOLDS } from "$lib/constants";
import { admin } from "$lib/server/admin";
import type { AIClassification } from "$lib/server/ai-classifier";
import {
  classifyChurnSignal,
  getFallbackClassification,
} from "$lib/server/ai-classifier";
import { decryptStoredToken } from "$lib/server/crypto";
import { sendSequenceEmail } from "$lib/server/email-sender";
import { resolveOrganization } from "$lib/server/organizations";
import { toSignal } from "$lib/signal-utils";
import type {
  ChurnSignal,
  SequenceEmail,
  SignalStatus,
  SignalType,
} from "$lib/types";
import type {
  ChurnSignalRow,
  OrganizationRow,
  SequenceEmailRow,
} from "$lib/types/supabase";

type CustomerContext = {
  name: string | null;
  email: string | null;
  customerSince: string | null;
  stripeUrl: string | null;
};

function computeRiskScore(signal: ChurnSignal): number {
  const baseScore: Record<SignalType, number> = {
    card_failed: 48,
    disengaged: 32,
    downgraded: 56,
    paused: 38,
    cancelled: 72,
    high_mrr_risk: 82,
    trial_ending: 64,
  };
  const mrrContribution = Math.min(18, Math.round(signal.mrr_amount / 5_000));
  const highValueBonus =
    signal.mrr_amount > CHURN_THRESHOLDS.HIGH_MRR_CENTS ? 12 : 0;

  return Math.min(
    100,
    baseScore[signal.signal_type] + mrrContribution + highValueBonus,
  );
}

async function loadSignal(
  signalId: string,
  orgId: string,
): Promise<ChurnSignal | null> {
  const { data, error } = await admin
    .from("churn_signals")
    .select("*")
    .eq("id", signalId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toSignal(data as unknown as ChurnSignalRow) : null;
}

async function loadEmails(
  signalId: string,
  orgId: string,
): Promise<SequenceEmail[]> {
  const { data, error } = await admin
    .from("sequence_emails")
    .select("*")
    .eq("signal_id", signalId)
    .eq("org_id", orgId)
    .order("step", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as SequenceEmailRow[]).map((row) => ({
    ...row,
  }));
}

async function loadCustomerContext(
  org: OrganizationRow,
  signal: ChurnSignal,
): Promise<CustomerContext> {
  if (signal.customer_name && signal.customer_email) {
    return {
      name: signal.customer_name,
      email: signal.customer_email,
      customerSince: null,
      stripeUrl: signal.polar_customer_id
        ? `https://dashboard.stripe.com/customers/${signal.polar_customer_id}`
        : null,
    };
  }

  if (!signal.polar_customer_id) {
    return {
      name: signal.customer_name,
      email: signal.customer_email,
      customerSince: null,
      stripeUrl: null,
    };
  }

  try {
    const accessToken = decryptStoredToken(org.polar_access_token);
    if (accessToken) {
      const stripe = new Stripe(accessToken);
      const customer = await stripe.customers.retrieve(
        signal.polar_customer_id,
      );

      if (!customer.deleted) {
        const customerSince =
          typeof customer.metadata?.customer_since === "string" &&
          customer.metadata.customer_since.trim()
            ? customer.metadata.customer_since
            : new Date(customer.created * 1000).toISOString();

        await admin
          .from("churn_signals")
          .update({
            customer_name: customer.name ?? signal.customer_name,
            customer_email: customer.email ?? signal.customer_email,
          } as never)
          .eq("id", signal.id)
          .eq("org_id", org.id);

        return {
          name: customer.name ?? signal.customer_name,
          email: customer.email ?? signal.customer_email,
          customerSince,
          stripeUrl: `https://dashboard.stripe.com/customers/${signal.polar_customer_id}`,
        };
      }
    }
  } catch {
    // fall back to stored customer context
  }

  return {
    name: signal.customer_name,
    email: signal.customer_email,
    customerSince: null,
    stripeUrl: `https://dashboard.stripe.com/customers/${signal.polar_customer_id}`,
  };
}

async function ensureClassification(
  signal: ChurnSignal,
): Promise<AIClassification> {
  if (signal.ai_churn_reason && signal.ai_win_back_angle) {
    return getFallbackClassification(signal);
  }

  const classification = await classifyChurnSignal(signal);
  const { error: updateError } = await admin
    .from("churn_signals")
    .update({
      ai_churn_reason: classification.churn_reason,
      ai_win_back_angle: classification.win_back_angle,
    } as never)
    .eq("id", signal.id);

  if (updateError) {
    throw updateError;
  }

  return classification;
}

async function updateSignalStatus(
  signalId: string,
  orgId: string,
  status: SignalStatus,
): Promise<void> {
  const { error: updateError } = await admin
    .from("churn_signals")
    .update({
      status,
      resolved_at:
        status === "recovered" || status === "dismissed"
          ? new Date().toISOString()
          : null,
    } as never)
    .eq("id", signalId)
    .eq("org_id", orgId);

  if (updateError) {
    throw updateError;
  }
}

export const load: PageServerLoad = async ({ locals, params }) => {
  const organization = await resolveOrganization(locals.session?.userId);

  if (!organization) {
    throw error(404, "Workspace not found");
  }

  const signal = await loadSignal(params.id, organization.id);

  if (!signal) {
    throw error(404, "Signal not found");
  }

  const [emails, classification, customerContext] = await Promise.all([
    loadEmails(signal.id, organization.id),
    ensureClassification(signal),
    loadCustomerContext(organization, signal),
  ]);

  return {
    title: "Signal Detail",
    breadcrumb: [
      "ChurnPulse",
      "Signals",
      signal.customer_name ?? "Signal detail",
    ],
    signal,
    emails,
    classification,
    customerContext,
    riskScore: computeRiskScore(signal),
  };
};

export const actions: Actions = {
  markRecovered: async ({ locals, params }) => {
    const organization = await resolveOrganization(locals.session?.userId);

    if (!organization) {
      return fail(404, { message: "Workspace not found." });
    }

    await updateSignalStatus(params.id, organization.id, "recovered");
    return { message: "Signal marked as recovered." };
  },

  dismissSignal: async ({ locals, params }) => {
    const organization = await resolveOrganization(locals.session?.userId);

    if (!organization) {
      return fail(404, { message: "Workspace not found." });
    }

    await updateSignalStatus(params.id, organization.id, "dismissed");
    return { message: "Signal dismissed." };
  },

  stopSequence: async ({ locals, params }) => {
    const organization = await resolveOrganization(locals.session?.userId);

    if (!organization) {
      return fail(404, { message: "Workspace not found." });
    }

    const { error: updateError } = await admin
      .from("sequence_emails")
      .update({
        status: "dismissed",
      } as never)
      .eq("signal_id", params.id)
      .eq("org_id", organization.id)
      .eq("status", "pending");

    if (updateError) {
      return fail(500, {
        message: "Pending sequence steps could not be stopped.",
      });
    }

    return { message: "Pending sequence steps stopped." };
  },

  sendNow: async ({ locals, request, params }) => {
    const organization = await resolveOrganization(locals.session?.userId);
    const formData = await request.formData();
    const emailId = formData.get("emailId");

    if (!organization) {
      return fail(404, { message: "Workspace not found." });
    }

    let targetEmailId: string | null =
      typeof emailId === "string" ? emailId.trim() : null;

    if (targetEmailId) {
      const { data: emailRow, error: emailRowError } = await admin
        .from("sequence_emails")
        .select("id")
        .eq("id", targetEmailId)
        .eq("signal_id", params.id)
        .eq("org_id", organization.id)
        .maybeSingle();

      if (emailRowError) {
        return fail(500, { message: "Email ownership could not be verified." });
      }

      if (!emailRow) {
        return fail(403, { message: "Email not found or access denied." });
      }
    }

    if (!targetEmailId) {
      const { data, error: queryError } = await admin
        .from("sequence_emails")
        .select("id, step")
        .eq("signal_id", params.id)
        .eq("org_id", organization.id)
        .eq("status", "pending")
        .order("step", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (queryError) {
        return fail(500, {
          message: "Pending sequence steps could not be loaded.",
        });
      }

      targetEmailId =
        (data as unknown as Pick<SequenceEmailRow, "id"> | null)?.id ?? null;
    }

    if (!targetEmailId) {
      return fail(400, {
        message: "No pending email is available for this signal.",
      });
    }

    await sendSequenceEmail(targetEmailId);
    return { message: "Sequence email sent immediately." };
  },

  runAiAnalysis: async ({ locals, params }) => {
    const organization = await resolveOrganization(locals.session?.userId);

    if (!organization) {
      return fail(404, { message: "Workspace not found." });
    }

    const signal = await loadSignal(params.id, organization.id);

    if (!signal) {
      return fail(404, { message: "Signal not found." });
    }

    const classification = await classifyChurnSignal(signal);
    const { error: updateError } = await admin
      .from("churn_signals")
      .update({
        ai_churn_reason: classification.churn_reason,
        ai_win_back_angle: classification.win_back_angle,
      } as never)
      .eq("id", signal.id)
      .eq("org_id", organization.id);

    if (updateError) {
      return fail(500, { message: "AI analysis could not be refreshed." });
    }

    return { message: "AI analysis refreshed." };
  },
};
