CREATE TABLE IF NOT EXISTS rate_limit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_key_created
  ON rate_limit_events(key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_churn_signals_org_status
  ON churn_signals(org_id, status);

CREATE INDEX IF NOT EXISTS idx_churn_signals_org_detected
  ON churn_signals(org_id, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_churn_signals_org_type_status
  ON churn_signals(org_id, signal_type, status);

CREATE INDEX IF NOT EXISTS idx_sequence_emails_org_status_scheduled
  ON sequence_emails(org_id, status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_sequence_emails_signal_id
  ON sequence_emails(signal_id);

CREATE INDEX IF NOT EXISTS idx_provider_events_org_created
  ON provider_events(org_id, created_at DESC);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE churn_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_owner_access ON organizations;
CREATE POLICY org_owner_access
  ON organizations
  FOR ALL
  USING (
    user_id::text = auth.uid()::text
    OR coalesce(metadata->>'clerk_user_id', '') = coalesce(auth.jwt()->>'sub', '')
  )
  WITH CHECK (
    user_id::text = auth.uid()::text
    OR coalesce(metadata->>'clerk_user_id', '') = coalesce(auth.jwt()->>'sub', '')
  );

DROP POLICY IF EXISTS signals_org_access ON churn_signals;
CREATE POLICY signals_org_access
  ON churn_signals
  FOR ALL
  USING (
    org_id IN (
      SELECT id
      FROM organizations
      WHERE
        user_id::text = auth.uid()::text
        OR coalesce(metadata->>'clerk_user_id', '') = coalesce(auth.jwt()->>'sub', '')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT id
      FROM organizations
      WHERE
        user_id::text = auth.uid()::text
        OR coalesce(metadata->>'clerk_user_id', '') = coalesce(auth.jwt()->>'sub', '')
    )
  );

DROP POLICY IF EXISTS sequence_emails_org_access ON sequence_emails;
CREATE POLICY sequence_emails_org_access
  ON sequence_emails
  FOR ALL
  USING (
    org_id IN (
      SELECT id
      FROM organizations
      WHERE
        user_id::text = auth.uid()::text
        OR coalesce(metadata->>'clerk_user_id', '') = coalesce(auth.jwt()->>'sub', '')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT id
      FROM organizations
      WHERE
        user_id::text = auth.uid()::text
        OR coalesce(metadata->>'clerk_user_id', '') = coalesce(auth.jwt()->>'sub', '')
    )
  );

DROP POLICY IF EXISTS provider_events_org_access ON provider_events;
CREATE POLICY provider_events_org_access
  ON provider_events
  FOR ALL
  USING (
    org_id IN (
      SELECT id
      FROM organizations
      WHERE
        user_id::text = auth.uid()::text
        OR coalesce(metadata->>'clerk_user_id', '') = coalesce(auth.jwt()->>'sub', '')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT id
      FROM organizations
      WHERE
        user_id::text = auth.uid()::text
        OR coalesce(metadata->>'clerk_user_id', '') = coalesce(auth.jwt()->>'sub', '')
    )
  );

DROP POLICY IF EXISTS rate_limit_events_service_role_only ON rate_limit_events;
CREATE POLICY rate_limit_events_service_role_only
  ON rate_limit_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
