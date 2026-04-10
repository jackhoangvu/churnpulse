-- Add providers JSONB column to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS providers jsonb DEFAULT '[]'::jsonb;

-- Provider events log (idempotency + audit trail)
CREATE TABLE IF NOT EXISTS provider_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations NOT NULL,
  provider text NOT NULL CHECK (provider IN ('stripe','paddle','lemonsqueezy','polar')),
  event_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed boolean DEFAULT false,
  error_message text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(provider, event_id)
);

-- Add provider column to churn_signals
ALTER TABLE churn_signals ADD COLUMN IF NOT EXISTS provider text DEFAULT 'polar';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_churn_signals_org_detected
  ON churn_signals(org_id, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_sequence_emails_scheduled
  ON sequence_emails(status, scheduled_for)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_provider_events_org
  ON provider_events(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_provider_events_unprocessed
  ON provider_events(processed, created_at)
  WHERE processed = false;

-- Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  properties jsonb DEFAULT '{}'::jsonb,
  session_id text,
  created_at timestamptz DEFAULT now()
);

-- RLS for new tables
ALTER TABLE provider_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members see provider events"
  ON provider_events FOR ALL
  USING (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

-- Analytics is write-only from server, no RLS needed for reads by users
CREATE POLICY "Anyone can insert analytics"
  ON analytics_events FOR INSERT WITH CHECK (true);
