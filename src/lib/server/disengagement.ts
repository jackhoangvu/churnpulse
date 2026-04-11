import { logger, schedules } from "@trigger.dev/sdk/v3";
import Stripe from "stripe";
import { CHURN_THRESHOLDS } from "$lib/constants";
import { admin } from "$lib/server/admin";
import { decryptStoredToken } from "$lib/server/crypto";
import { scheduleSequence } from "$lib/server/sequences";
import { logSignalDetected } from "$lib/server/logger";
import type { ChurnSignal, Organization } from "$lib/types";
import type { ChurnSignalRow, OrganizationRow } from "$lib/types/supabase";

const DAY = 24 * 60 * 60 * 1000;

function serializeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function hasRecentDisengagedSignal(
  orgId: string,
  stripeCustomerId: string,
): Promise<boolean> {
  const since = new Date(
    Date.now() - CHURN_THRESHOLDS.DISENGAGEMENT_DAYS * DAY,
  ).toISOString();
  const { data, error } = await admin
    .from("churn_signals")
    .select("id")
    .eq("org_id", orgId)
    .eq("polar_customer_id", stripeCustomerId)
    .eq("signal_type", "disengaged")
    .gte("detected_at", since)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

async function insertDisengagedSignal(
  org: Organization,
  subscription: Stripe.Subscription,
  customer: Stripe.Customer,
): Promise<void> {
  if (await hasRecentDisengagedSignal(org.id, customer.id)) {
    return;
  }

  const mrrAmount = subscription.items.data.reduce((total, item) => {
    return total + (item.price?.unit_amount ?? 0) * (item.quantity ?? 1);
  }, 0);

  const { data, error } = await admin
    .from("churn_signals")
    .insert({
      org_id: org.id,
      polar_customer_id: customer.id,
      customer_email: customer.email,
      customer_name: customer.name,
      signal_type: "disengaged",
      mrr_amount: mrrAmount,
      status: "detected",
      metadata: {
        last_login_at: customer.metadata?.last_login_at ?? null,
        subscription_id: subscription.id,
      },
    } as never)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    throw error ?? new Error("Failed to insert disengaged signal");
  }

  const signal = {
    ...(data as unknown as ChurnSignalRow),
    provider:
      ((data as unknown as ChurnSignalRow)
        .provider as ChurnSignal["provider"]) ?? "polar",
    signal_type: "disengaged",
    status: "detected",
  } satisfies ChurnSignal;
  logSignalDetected(signal, org.id);
  await scheduleSequence(signal.id, "disengaged", org);
}

export const scanDisengagedCustomers = schedules.task({
  id: "scan-disengaged-customers",
  cron: {
    pattern: "0 0 * * *",
    timezone: "UTC",
  },
  run: async () => {
    let scanned = 0;
    let created = 0;

    try {
      const { data, error } = await admin
        .from("organizations")
        .select("*")
        .not("polar_access_token", "is", null);
      const organizations = (data as unknown as OrganizationRow[] | null) ?? [];

      if (error) {
        throw error;
      }

      for (const org of organizations) {
        try {
          if (!org.polar_access_token) {
            continue;
          }

          const accessToken = decryptStoredToken(org.polar_access_token);
          if (!accessToken) {
            continue;
          }

          const stripe = new Stripe(accessToken);
          const subscriptions = await stripe.subscriptions.list({
            status: "active",
            limit: 100,
          });

          for (const subscription of subscriptions.data) {
            scanned += 1;

            if (typeof subscription.customer !== "string") {
              continue;
            }

            const customer = await stripe.customers.retrieve(
              subscription.customer,
            );

            if (customer.deleted) {
              continue;
            }

            const lastLoginAt = customer.metadata?.last_login_at;

            if (!lastLoginAt) {
              continue;
            }

            const lastLoginDate = new Date(lastLoginAt);

            if (Number.isNaN(lastLoginDate.getTime())) {
              continue;
            }

            if (
              lastLoginDate.getTime() >
              Date.now() - CHURN_THRESHOLDS.DISENGAGEMENT_DAYS * DAY
            ) {
              continue;
            }

            await insertDisengagedSignal(org, subscription, customer);
            created += 1;
          }
        } catch (error) {
          logger.error("Disengagement scan org failed", {
            job: "scan-disengaged-customers",
            error: serializeError(error),
            signal_id: null,
            org_id: org.id,
          });
        }
      }

      return { scanned, created };
    } catch (error) {
      logger.error("Disengagement scan failed", {
        job: "scan-disengaged-customers",
        error: serializeError(error),
        signal_id: null,
      });

      return { scanned, created };
    }
  },
});

export const scanDisengagementSignals = scanDisengagedCustomers;
