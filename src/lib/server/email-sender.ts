import { Resend } from "resend";
import Stripe from "stripe";
import { EMAIL_CONFIG } from "$lib/constants";
import { env } from "$lib/env";
import type { AIClassification } from "$lib/server/ai-classifier";
import {
  classifyChurnSignal,
  getFallbackClassification,
} from "$lib/server/ai-classifier";
import { admin } from "$lib/server/admin";
import { decryptStoredToken } from "$lib/server/crypto";
import { generateEmailContent } from "$lib/server/email-templates";
import { logEmailSent, logError, log } from "$lib/server/logger";
import { toSignal } from "$lib/signal-utils";
import type { ChurnSignal } from "$lib/types";
import type {
  Database,
  ChurnSignalRow,
  OrganizationRow,
  SequenceEmailRow,
} from "$lib/types/supabase";

const resend = new Resend(env.resendApiKey);

function getFromAddress(): string {
  return env.nodeEnv === "development"
    ? EMAIL_CONFIG.FROM_DEVELOPMENT
    : EMAIL_CONFIG.FROM_PRODUCTION;
}

function getStripeClient(apiKey: string): Stripe {
  return new Stripe(apiKey);
}

async function getBillingPortalUrl(
  signal: ChurnSignal,
  org: OrganizationRow,
): Promise<string | undefined> {
  if (!signal.polar_customer_id) {
    return undefined;
  }

  try {
    const orgAccessToken = decryptStoredToken(org.polar_access_token);

    if (orgAccessToken) {
      const stripe = getStripeClient(orgAccessToken);
      const session = await stripe.billingPortal.sessions.create({
        customer: signal.polar_customer_id,
        return_url: `${env.publicAppUrl}/dashboard`,
      });

      return session.url;
    }

    if (org.polar_account_id) {
      const stripe = getStripeClient(env.stripeSecretKey);
      const session = await stripe.billingPortal.sessions.create(
        {
          customer: signal.polar_customer_id,
          return_url: `${env.publicAppUrl}/dashboard`,
        },
        {
          stripeAccount: org.polar_account_id,
        },
      );

      return session.url;
    }
  } catch (error) {
    logError("send-sequence-email", error, { signal_id: signal.id });
  }

  return undefined;
}

async function updateEmailStatus(
  emailRowId: string,
  update: Database["public"]["Tables"]["sequence_emails"]["Update"],
  signalId: string | null,
): Promise<void> {
  const { error } = await admin
    .from("sequence_emails")
    .update(update as never)
    .eq("id", emailRowId);

  if (error) {
    log("error", "send-sequence-email", "Failed to update email status", {
      error: error.message,
      signal_id: signalId,
    });
  }
}

async function loadSequenceContext(emailRowId: string): Promise<{
  emailRow: SequenceEmailRow | null;
  signal: ChurnSignal | null;
  org: OrganizationRow | null;
}> {
  const { data: emailRow, error: emailError } = await admin
    .from("sequence_emails")
    .select("*")
    .eq("id", emailRowId)
    .maybeSingle();
  const typedEmailRow = emailRow as unknown as SequenceEmailRow | null;

  if (emailError || !typedEmailRow) {
    log("error", "send-sequence-email", "Sequence email row not found", {
      error: emailError?.message ?? "Sequence email row not found",
      signal_id: null,
    });

    return { emailRow: null, signal: null, org: null };
  }

  const [
    { data: signalRow, error: signalError },
    { data: org, error: orgError },
  ] = await Promise.all([
    admin
      .from("churn_signals")
      .select("*")
      .eq("id", typedEmailRow.signal_id)
      .maybeSingle(),
    admin
      .from("organizations")
      .select("*")
      .eq("id", typedEmailRow.org_id)
      .maybeSingle(),
  ]);
  const typedSignalRow = signalRow as unknown as ChurnSignalRow | null;
  const typedOrg = org as unknown as OrganizationRow | null;

  if (signalError || !typedSignalRow || orgError || !typedOrg) {
    log("error", "send-sequence-email", "Missing signal or organization", {
      error:
        signalError?.message ??
        orgError?.message ??
        "Missing signal or organization",
      signal_id: typedEmailRow.signal_id,
    });

    return { emailRow: typedEmailRow, signal: null, org: null };
  }

  return {
    emailRow: typedEmailRow,
    signal: toSignal(typedSignalRow),
    org: typedOrg,
  };
}

async function resolveClassification(
  signal: ChurnSignal,
): Promise<AIClassification> {
  if (signal.ai_churn_reason && signal.ai_win_back_angle) {
    return getFallbackClassification(signal);
  }

  const classification = await classifyChurnSignal(signal);
  const { error } = await admin
    .from("churn_signals")
    .update({
      ai_churn_reason: classification.churn_reason,
      ai_win_back_angle: classification.win_back_angle,
    } as never)
    .eq("id", signal.id);

  if (error) {
    log("error", "send-sequence-email", "Failed to save AI classification", {
      error: error.message,
      signal_id: signal.id,
    });
  }

  return classification;
}

export async function sendSequenceEmail(emailRowId: string): Promise<void> {
  let signalId: string | null = null;

  try {
    const { emailRow, signal, org } = await loadSequenceContext(emailRowId);

    if (!emailRow || !signal || !org) {
      if (emailRow) {
        await updateEmailStatus(
          emailRow.id,
          { status: "failed" },
          emailRow.signal_id,
        );
      }

      return;
    }

    signalId = signal.id;

    if (!signal.customer_email) {
      await updateEmailStatus(emailRow.id, { status: "failed" }, signal.id);
      console.error({
        job: "send-sequence-email",
        error: "Signal has no customer_email",
        signal_id: signal.id,
      });
      return;
    }

    const classification = await resolveClassification(signal);
    const updateCardUrl = await getBillingPortalUrl(signal, org);
    const content = generateEmailContent({
      signal,
      step: emailRow.step,
      classification,
      org_name: org.name ?? "Your team",
      update_card_url: updateCardUrl,
    });

    const response = await resend.emails.send({
      from: getFromAddress(),
      to: signal.customer_email,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    await updateEmailStatus(
      emailRow.id,
      {
        status: "sent",
        sent_at: new Date().toISOString(),
        subject: content.subject,
        body: content.html,
      },
      signal.id,
    );
    logEmailSent(
      {
        ...emailRow,
        status: "sent",
        subject: content.subject,
        body: content.html,
        sent_at: new Date().toISOString(),
      },
      signal.id,
    );

    if (signal.status !== "sequence_started") {
      const { error } = await admin
        .from("churn_signals")
        .update({
          status: "sequence_started",
        } as never)
        .eq("id", signal.id);

      if (error) {
        log(
          "error",
          "send-sequence-email",
          "Failed to mark signal as sequence_started",
          {
            error: error.message,
            signal_id: signal.id,
          },
        );
      }
    }
  } catch (error) {
    await updateEmailStatus(
      emailRowId,
      {
        status: "failed",
      },
      signalId,
    );

    logError("send-sequence-email", error, { signal_id: signalId });
  }
}
