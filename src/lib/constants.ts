export const CHURN_THRESHOLDS = {
  HIGH_MRR_CENTS: 50_000,
  DISENGAGEMENT_DAYS: 14,
  DOWNGRADE_PCT_THRESHOLD: 20,
  TRIAL_ENDING_DAYS: 3,
  DEDUP_WINDOWS: {
    card_failed: 7,
    cancelled: 30,
    downgraded: 7,
    paused: 14,
    trial_ending: 3,
    disengaged: 14,
    high_mrr_risk: 7,
  },
} as const;

export const EMAIL_CONFIG = {
  FROM_DEVELOPMENT: "ChurnPulse <onboarding@resend.dev>",
  FROM_PRODUCTION: "ChurnPulse <noreply@churnpulse.io>",
} as const;

export const SECURITY_CONFIG = {
  OAUTH_STATE_TTL_MS: 10 * 60 * 1000,
  MIN_WEBHOOK_SECRET_LENGTH: 16,
} as const;

export const PAGINATION = {
  RECOVERY_PER_PAGE: 25,
  SEQUENCES_PER_PAGE: 25,
} as const;

export const CACHE_TTL_MS = {
  DASHBOARD_STATS: 60_000,
  ANALYTICS_EVENTS: 100,
} as const;
