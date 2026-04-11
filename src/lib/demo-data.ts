import type { ChurnSignal, SequenceEmail } from "$lib/types";

const now = new Date();
const daysAgo = (days: number) =>
  new Date(now.getTime() - days * 86_400_000).toISOString();
const hoursAgo = (hours: number) =>
  new Date(now.getTime() - hours * 3_600_000).toISOString();

function buildDemoSparkline(): Array<{
  date: string;
  label: string;
  count: number;
}> {
  const formatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
  const counts = [1, 2, 0, 1, 3, 2, 4];

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - index));

    return {
      date: date.toISOString().slice(0, 10),
      label: formatter.format(date),
      count: counts[index] ?? 0,
    };
  });
}

export const DEMO_SIGNALS: ChurnSignal[] = [
  {
    id: "demo-sig-1",
    org_id: "demo",
    provider: "stripe",
    polar_customer_id: "cus_demo1",
    customer_email: "billing@acmecorp.io",
    customer_name: "Acme Corp",
    signal_type: "card_failed",
    mrr_amount: 89_000,
    polar_event_id: "evt_demo1",
    status: "sequence_started",
    ai_churn_reason:
      "Card expired - likely an inadvertent billing failure, not intentional churn.",
    ai_win_back_angle:
      "Low-friction payment recovery with empathetic tone. High probability of save.",
    metadata: { invoice_id: "in_demo1", attempt_count: 2, currency: "usd" },
    detected_at: hoursAgo(2),
    resolved_at: null,
  },
  {
    id: "demo-sig-2",
    org_id: "demo",
    provider: "polar",
    polar_customer_id: "cus_demo2",
    customer_email: "team@loomai.co",
    customer_name: "Loom AI",
    signal_type: "disengaged",
    mrr_amount: 210_000,
    polar_event_id: "evt_demo2",
    status: "sequence_started",
    ai_churn_reason:
      "No meaningful product activity in 18 days. Likely overwhelmed or found workaround.",
    ai_win_back_angle:
      "Re-engage around a concrete outcome they have not reached. Offer a walkthrough.",
    metadata: { last_login_at: daysAgo(18) },
    detected_at: daysAgo(3),
    resolved_at: null,
  },
  {
    id: "demo-sig-3",
    org_id: "demo",
    provider: "paddle",
    polar_customer_id: "cus_demo3",
    customer_email: "finance@pylonhq.com",
    customer_name: "Pylon HQ",
    signal_type: "downgraded",
    mrr_amount: 34_000,
    polar_event_id: "evt_demo3",
    status: "detected",
    ai_churn_reason:
      "Plan downgraded 45% - budget pressure or perceived value gap.",
    ai_win_back_angle:
      "Value reinforcement: what features are they missing? Is a custom plan possible?",
    metadata: { previous_mrr: 61_000, new_mrr: 34_000, percent_decrease: 44.3 },
    detected_at: daysAgo(1),
    resolved_at: null,
  },
  {
    id: "demo-sig-4",
    org_id: "demo",
    provider: "lemonsqueezy",
    polar_customer_id: "cus_demo4",
    customer_email: "ops@cycleapp.io",
    customer_name: "Cycle App",
    signal_type: "high_mrr_risk",
    mrr_amount: 440_000,
    polar_event_id: "evt_demo4",
    status: "sequence_started",
    ai_churn_reason:
      "High-value customer showing subscription cancellation intent following downgrade.",
    ai_win_back_angle:
      "Executive-level, personal outreach. This account warrants a direct call.",
    metadata: { is_high_value: true, urgency: "critical" },
    detected_at: hoursAgo(4),
    resolved_at: null,
  },
  {
    id: "demo-sig-5",
    org_id: "demo",
    provider: "stripe",
    polar_customer_id: "cus_demo5",
    customer_email: "billing@raycast.com",
    customer_name: "Raycast",
    signal_type: "cancelled",
    mrr_amount: 120_000,
    polar_event_id: "evt_demo5",
    status: "recovered",
    ai_churn_reason:
      "Cancelled after trial - did not reach activation before billing started.",
    ai_win_back_angle: "Win-back with extended trial and onboarding support.",
    metadata: { subscription_id: "sub_demo5" },
    detected_at: daysAgo(7),
    resolved_at: daysAgo(4),
  },
  {
    id: "demo-sig-6",
    org_id: "demo",
    provider: "polar",
    polar_customer_id: "cus_demo6",
    customer_email: "admin@linearapp.io",
    customer_name: "Linear App",
    signal_type: "trial_ending",
    mrr_amount: 59_000,
    polar_event_id: "evt_demo6",
    status: "sequence_started",
    ai_churn_reason:
      "Trial ending in 2 days - user has not upgraded or shown strong engagement.",
    ai_win_back_angle:
      "Conversion nudge: what would make paid feel like a clear win right now?",
    metadata: { trial_ends_at: hoursAgo(-48) },
    detected_at: hoursAgo(6),
    resolved_at: null,
  },
  {
    id: "demo-sig-7",
    org_id: "demo",
    provider: "paddle",
    polar_customer_id: "cus_demo7",
    customer_email: "hello@superhuman.co",
    customer_name: "Superhuman",
    signal_type: "paused",
    mrr_amount: 75_000,
    polar_event_id: "evt_demo7",
    status: "detected",
    ai_churn_reason:
      "Subscription paused after support escalation - likely frustration with a specific feature.",
    ai_win_back_angle:
      "Reach out with empathy, address the underlying issue, offer easy reactivation.",
    metadata: { subscription_id: "sub_demo7" },
    detected_at: daysAgo(2),
    resolved_at: null,
  },
];

export const DEMO_SEQUENCES: SequenceEmail[] = [
  {
    id: "demo-email-1",
    signal_id: "demo-sig-1",
    org_id: "demo",
    email_to: "billing@acmecorp.io",
    subject: "Your payment didn't go through - quick fix needed",
    body: null,
    step: 1,
    status: "sent",
    scheduled_for: hoursAgo(2),
    sent_at: hoursAgo(2),
    created_at: hoursAgo(2),
  },
  {
    id: "demo-email-2",
    signal_id: "demo-sig-1",
    org_id: "demo",
    email_to: "billing@acmecorp.io",
    subject: "Still having trouble with your payment",
    body: null,
    step: 2,
    status: "pending",
    scheduled_for: new Date(Date.now() + 22 * 3_600_000).toISOString(),
    sent_at: null,
    created_at: hoursAgo(2),
  },
  {
    id: "demo-email-3",
    signal_id: "demo-sig-4",
    org_id: "demo",
    email_to: "ops@cycleapp.io",
    subject: "We need to talk - your account needs attention",
    body: null,
    step: 1,
    status: "sent",
    scheduled_for: hoursAgo(3),
    sent_at: hoursAgo(3),
    created_at: hoursAgo(4),
  },
];

export const DEMO_STATS = {
  totalDetected: 7,
  countsByStatus: {
    detected: 2,
    sequence_started: 3,
    recovered: 1,
    churned: 0,
    dismissed: 1,
  },
  countsBySignalType: {
    card_failed: 1,
    disengaged: 1,
    downgraded: 1,
    paused: 1,
    cancelled: 1,
    high_mrr_risk: 1,
    trial_ending: 1,
  },
  atRiskMrr: 100_700 * 100,
  recoveredMrr: 120_000,
  recoveryRate: 67,
  activeSignals: 5,
  sparkline: buildDemoSparkline(),
  recentSignals: [] as ChurnSignal[],
  scheduledToday: 3,
  weekDeltas: {
    atRiskMrr: 23_400 * 100,
    recoveredMrr: 12_000,
    activeSignals: 2,
    recoveryRate: 12,
  },
};

DEMO_STATS.recentSignals = DEMO_SIGNALS.slice(0, 5);
