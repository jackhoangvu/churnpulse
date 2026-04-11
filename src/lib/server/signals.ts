import { Resend } from "resend";
import Stripe from "stripe";
import { CLERK_SECRET_KEY } from "$env/static/private";
import { CHURN_THRESHOLDS, EMAIL_CONFIG } from "$lib/constants";
import { env } from "$lib/env";
import { log, logError, logSignalDetected } from "$lib/server/logger";
import { admin } from "$lib/server/admin";
import { decryptStoredToken } from "$lib/server/crypto";
import { getOrganizationClerkUserId } from "$lib/server/organizations";
import { scheduleSequence } from "$lib/server/sequences";
import type { ChurnSignal, Organization, SignalType } from "$lib/types";
import type { Database, ChurnSignalRow, Json } from "$lib/types/supabase";

const resend = new Resend(env.resendApiKey);
const DAY = 24 * 60 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function getObjectMetadata(value: unknown): Record<string, unknown> {
  if (isRecord(value) && isRecord(value.metadata)) {
    return value.metadata;
  }

  return {};
}

function extractCustomerId(customer: unknown): string | null {
  if (typeof customer === "string") {
    return customer;
  }

  if (isRecord(customer)) {
    return readString(customer.id);
  }

  return null;
}

function extractJsonObject(value: Json | null): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function extractOrgMetadata(org: Organization): Record<string, unknown> {
  return isRecord(org.metadata) ? org.metadata : {};
}

function normalizeSignal(row: ChurnSignalRow): ChurnSignal {
  return {
    ...row,
    provider: (row.provider as ChurnSignal["provider"]) ?? "polar",
    signal_type: row.signal_type as SignalType,
    status: row.status as ChurnSignal["status"],
    metadata: row.metadata,
  };
}

function getSubscriptionAmount(items: unknown): number {
  if (!isRecord(items) || !Array.isArray(items.data)) {
    return 0;
  }

  return items.data.reduce((total, item) => {
    if (!isRecord(item)) {
      return total;
    }

    const quantity =
      typeof item.quantity === "number" && Number.isFinite(item.quantity)
        ? item.quantity
        : 1;
    const price = isRecord(item.price) ? item.price : null;
    const unitAmount =
      price &&
      typeof price.unit_amount === "number" &&
      Number.isFinite(price.unit_amount)
        ? price.unit_amount
        : 0;

    return total + unitAmount * quantity;
  }, 0);
}

async function resolveOwnerEmail(org: Organization): Promise<string | null> {
  const metadata = extractOrgMetadata(org);
  const notifications = isRecord(metadata.notifications)
    ? metadata.notifications
    : {};
  const customAlertEmail = readString(notifications.alert_email);
  const highMrrEnabled =
    typeof notifications.high_mrr_alerts_enabled === "boolean"
      ? notifications.high_mrr_alerts_enabled
      : true;

  if (!highMrrEnabled) {
    return null;
  }

  if (customAlertEmail) {
    return customAlertEmail;
  }

  try {
    const clerkUserId = getOrganizationClerkUserId(org);
    if (!clerkUserId) {
      return null;
    }

    const response = await fetch(
      `https://api.clerk.com/v1/users/${clerkUserId}`,
      {
        headers: {
          Authorization: `Bearer ${CLERK_SECRET_KEY}`,
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      primary_email_address_id?: string;
      email_addresses?: Array<{ id?: string; email_address?: string }>;
    };

    const email =
      payload.email_addresses?.find(
        (entry) => entry.id === payload.primary_email_address_id,
      )?.email_address ?? payload.email_addresses?.[0]?.email_address;

    return readString(email);
  } catch (error) {
    logError("signals.resolve-owner-email", error, { org_id: org.id });
    return null;
  }
}

async function sendHighValueAlert(
  org: Organization,
  signal: ChurnSignal,
): Promise<void> {
  const ownerEmail = await resolveOwnerEmail(org);

  if (!ownerEmail) {
    log(
      "warn",
      "signals.high-mrr-alert",
      "Skipping internal alert because owner email is unavailable",
      {
        org_id: org.id,
        signal_id: signal.id,
      },
    );
    return;
  }

  const orgName = org.name ?? "Your organization";
  const customerLabel =
    signal.customer_name ?? signal.customer_email ?? signal.polar_customer_id;
  const amountLabel = `$${(signal.mrr_amount / 100).toFixed(2)}`;
  const from =
    env.nodeEnv === "development"
      ? EMAIL_CONFIG.FROM_DEVELOPMENT
      : EMAIL_CONFIG.FROM_PRODUCTION;
  const subject = `High-value churn risk detected for ${customerLabel}`;
  const text = [
    `ChurnPulse detected a high-value ${signal.signal_type.replaceAll("_", " ")} signal.`,
    `Customer: ${customerLabel}`,
    `MRR at risk: ${amountLabel}`,
    `Organization: ${orgName}`,
    `Signal ID: ${signal.id}`,
  ].join("\n");
  const html = `
		<div style="background:#0A0A0B;color:#F0F0F2;padding:24px;font-family:Inter,Arial,sans-serif;">
			<div style="max-width:560px;margin:0 auto;border:1px solid rgba(255,255,255,0.08);padding:24px;background:#111113;">
				<div style="font-family:'IBM Plex Mono',monospace;color:#00E5FF;font-size:16px;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:20px;">ChurnPulse</div>
				<h1 style="font-size:20px;line-height:1.4;margin:0 0 12px;">High-value churn risk detected</h1>
				<p style="font-size:16px;line-height:1.7;margin:0 0 10px;">A ${signal.signal_type.replaceAll("_", " ")} signal was created for a high-value customer.</p>
				<p style="font-size:16px;line-height:1.7;margin:0 0 10px;"><strong>Customer:</strong> ${customerLabel}</p>
				<p style="font-size:16px;line-height:1.7;margin:0 0 10px;"><strong>MRR at risk:</strong> ${amountLabel}</p>
				<p style="font-size:16px;line-height:1.7;margin:0;"><strong>Signal ID:</strong> ${signal.id}</p>
			</div>
		</div>
	`;

  try {
    const response = await resend.emails.send({
      from,
      to: ownerEmail,
      subject,
      html,
      text,
    });

    if (response.error) {
      throw new Error(response.error.message);
    }
  } catch (error) {
    logError("signals.high-mrr-alert", error, {
      org_id: org.id,
      signal_id: signal.id,
    });
  }
}

async function fetchCustomerContact(
  org: Organization,
  customerId: string | null,
  metadata: Record<string, unknown>,
): Promise<{ email: string | null; name: string | null }> {
  const fallbackEmail = readString(metadata.customer_email);
  const fallbackName = readString(metadata.customer_name);

  const accessToken = decryptStoredToken(org.polar_access_token);

  if (!customerId || !accessToken) {
    return {
      email: fallbackEmail,
      name: fallbackName,
    };
  }

  try {
    const stripe = new Stripe(accessToken);
    const customer = await stripe.customers.retrieve(customerId);

    if (customer.deleted) {
      return {
        email: fallbackEmail,
        name: fallbackName,
      };
    }

    return {
      email: customer.email ?? fallbackEmail,
      name: customer.name ?? fallbackName,
    };
  } catch (error) {
    logError("signals.fetch-customer-contact", error, {
      org_id: org.id,
      polar_customer_id: customerId,
    });

    return {
      email: fallbackEmail,
      name: fallbackName,
    };
  }
}

async function findRecentSignal(
  orgId: string,
  customerId: string,
  signalType: SignalType,
  windowDays: number,
): Promise<ChurnSignalRow | null> {
  const since = new Date(Date.now() - windowDays * DAY).toISOString();
  const { data, error } = await admin
    .from("churn_signals")
    .select("*")
    .eq("org_id", orgId)
    .eq("polar_customer_id", customerId)
    .eq("signal_type", signalType)
    .gte("detected_at", since)
    .order("detected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as unknown as ChurnSignalRow | null) ?? null;
}

export async function detectHighMrrRisk(
  signal: ChurnSignal,
  org: Organization,
): Promise<void> {
  if (signal.mrr_amount <= CHURN_THRESHOLDS.HIGH_MRR_CENTS) {
    return;
  }

  const mergedMetadata = {
    ...extractJsonObject(signal.metadata),
    is_high_value: true,
    urgency: "critical",
  } satisfies Record<string, unknown>;

  const { error } = await admin
    .from("churn_signals")
    .update({
      metadata: mergedMetadata as Json,
    } as never)
    .eq("id", signal.id);

  if (error) {
    throw error;
  }

  await sendHighValueAlert(org, {
    ...signal,
    metadata: mergedMetadata as Json,
  });
}

async function insertSignal(params: {
  org: Organization;
  event: Stripe.Event;
  signalType: SignalType;
  stripeCustomerId: string;
  customerEmail: string | null;
  customerName: string | null;
  mrrAmount: number;
  metadata: Record<string, unknown>;
  dedupDays?: number;
}): Promise<void> {
  const recent = await findRecentSignal(
    params.org.id,
    params.stripeCustomerId,
    params.signalType,
    params.dedupDays ?? 7,
  );

  if (recent) {
    log("info", "signals", "Skipping duplicate signal inside dedupe window", {
      org_id: params.org.id,
      signal_type: params.signalType,
      polar_customer_id: params.stripeCustomerId,
      polar_event_id: params.event.id,
    });
    return;
  }

  const insertRow: Database["public"]["Tables"]["churn_signals"]["Insert"] = {
    org_id: params.org.id,
    polar_customer_id: params.stripeCustomerId,
    customer_email: params.customerEmail,
    customer_name: params.customerName,
    signal_type: params.signalType,
    mrr_amount: params.mrrAmount,
    polar_event_id: params.event.id,
    status: "detected",
    metadata: params.metadata as Json,
  };

  const { data, error } = await admin
    .from("churn_signals")
    .insert(insertRow as never)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    throw error ?? new Error("Failed to insert churn signal");
  }

  const signal = normalizeSignal(data as unknown as ChurnSignalRow);
  logSignalDetected(signal, params.org.id);
  await detectHighMrrRisk(signal, params.org);
  await scheduleSequence(signal.id, params.signalType, params.org);
}

export async function detectCardFailed(
  event: Stripe.Event,
  org: Organization,
): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const stripeCustomerId = extractCustomerId(invoice.customer);

  if (!stripeCustomerId) {
    return;
  }

  const metadata = getObjectMetadata(invoice);
  const amount = invoice.amount_due ?? invoice.amount_paid ?? 0;

  await insertSignal({
    org,
    event,
    signalType: "card_failed",
    stripeCustomerId,
    customerEmail:
      invoice.customer_email ?? readString(metadata.customer_email),
    customerName: invoice.customer_name ?? readString(metadata.customer_name),
    mrrAmount: amount,
    metadata: {
      invoice_id: invoice.id,
      amount,
      currency: invoice.currency ?? "usd",
    },
    dedupDays: 7,
  });
}

export async function detectDowngrade(
  event: Stripe.Event,
  org: Organization,
): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const previousAttributes =
    typeof event.data.previous_attributes === "object" &&
    event.data.previous_attributes !== null
      ? (event.data.previous_attributes as Record<string, unknown>)
      : {};
  const stripeCustomerId = extractCustomerId(subscription.customer);

  if (!stripeCustomerId) {
    return;
  }

  const currentMrr = getSubscriptionAmount(subscription.items);
  const previousMrr = getSubscriptionAmount(previousAttributes.items);

  if (previousMrr <= 0 || currentMrr >= previousMrr) {
    return;
  }

  const percentDecrease = ((previousMrr - currentMrr) / previousMrr) * 100;

  if (percentDecrease <= CHURN_THRESHOLDS.DOWNGRADE_PCT_THRESHOLD) {
    return;
  }

  const metadata = getObjectMetadata(subscription);
  const customer = await fetchCustomerContact(org, stripeCustomerId, metadata);

  await insertSignal({
    org,
    event,
    signalType: "downgraded",
    stripeCustomerId,
    customerEmail: customer.email,
    customerName: customer.name,
    mrrAmount: currentMrr,
    metadata: {
      previous_mrr: previousMrr,
      new_mrr: currentMrr,
      percent_decrease: Number(percentDecrease.toFixed(2)),
      subscription_id: subscription.id,
    },
  });
}

export async function detectPause(
  event: Stripe.Event,
  org: Organization,
): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;

  if (!subscription.pause_collection) {
    return;
  }

  const stripeCustomerId = extractCustomerId(subscription.customer);

  if (!stripeCustomerId) {
    return;
  }

  const metadata = getObjectMetadata(subscription);
  const customer = await fetchCustomerContact(org, stripeCustomerId, metadata);

  await insertSignal({
    org,
    event,
    signalType: "paused",
    stripeCustomerId,
    customerEmail: customer.email,
    customerName: customer.name,
    mrrAmount: getSubscriptionAmount(subscription.items),
    metadata: {
      subscription_id: subscription.id,
      pause_behavior: subscription.pause_collection.behavior,
      resumes_at: subscription.pause_collection.resumes_at ?? null,
    },
  });
}

export async function detectCancellation(
  event: Stripe.Event,
  org: Organization,
): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const stripeCustomerId = extractCustomerId(subscription.customer);

  if (!stripeCustomerId) {
    return;
  }

  const metadata = getObjectMetadata(subscription);
  const customer = await fetchCustomerContact(org, stripeCustomerId, metadata);

  await insertSignal({
    org,
    event,
    signalType: "cancelled",
    stripeCustomerId,
    customerEmail: customer.email,
    customerName: customer.name,
    mrrAmount: getSubscriptionAmount(subscription.items),
    metadata: {
      subscription_id: subscription.id,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at ?? null,
    },
  });
}

export async function detectTrialEnding(
  event: Stripe.Event,
  org: Organization,
): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const trialEnd =
    typeof subscription.trial_end === "number"
      ? subscription.trial_end * 1000
      : null;

  if (
    !trialEnd ||
    trialEnd > Date.now() + CHURN_THRESHOLDS.TRIAL_ENDING_DAYS * DAY
  ) {
    return;
  }

  const stripeCustomerId = extractCustomerId(subscription.customer);

  if (!stripeCustomerId) {
    return;
  }

  const metadata = getObjectMetadata(subscription);
  const customer = await fetchCustomerContact(org, stripeCustomerId, metadata);

  await insertSignal({
    org,
    event,
    signalType: "high_mrr_risk",
    stripeCustomerId,
    customerEmail: customer.email,
    customerName: customer.name,
    mrrAmount: getSubscriptionAmount(subscription.items),
    metadata: {
      reason: "trial_ending",
      subscription_id: subscription.id,
      trial_end: new Date(trialEnd).toISOString(),
    },
  });
}
