-- Dashboard UI: trade screenshots + trader challenge enrollments

ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS chart_screenshot_url TEXT;

CREATE TABLE IF NOT EXISTS trader_challenge_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES trader_challenges(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'paid', 'awaiting_setup', 'active', 'completed', 'cancelled')),
  payment_method TEXT
    CHECK (payment_method IS NULL OR payment_method IN ('balance', 'crypto')),
  amount_paid NUMERIC(18, 2),
  challenge_account_details TEXT,
  admin_rules TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_enrollments_user
  ON trader_challenge_enrollments (user_id, status);

CREATE INDEX IF NOT EXISTS idx_challenge_enrollments_status
  ON trader_challenge_enrollments (status, created_at DESC);

ALTER TABLE trader_challenge_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own challenge enrollments"
  ON trader_challenge_enrollments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own challenge enrollments"
  ON trader_challenge_enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage challenge enrollments"
  ON trader_challenge_enrollments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'administrator'
    )
  );
