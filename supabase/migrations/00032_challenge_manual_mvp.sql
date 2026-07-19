-- Manual Pool Manager Challenge MVP: enrollment extensions + challenge trades journal

ALTER TABLE trader_challenge_enrollments
  DROP CONSTRAINT IF EXISTS trader_challenge_enrollments_status_check;

ALTER TABLE trader_challenge_enrollments
  ADD CONSTRAINT trader_challenge_enrollments_status_check
  CHECK (status IN (
    'pending_payment', 'paid', 'awaiting_setup', 'waiting',
    'active', 'completed', 'passed', 'failed', 'rejected', 'cancelled'
  ));

ALTER TABLE trader_challenge_enrollments
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS initial_balance NUMERIC(18, 2),
  ADD COLUMN IF NOT EXISTS account_broker TEXT,
  ADD COLUMN IF NOT EXISTS account_server TEXT,
  ADD COLUMN IF NOT EXISTS account_login TEXT,
  ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES pool_manager_applications(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_challenge_enrollments_application
  ON trader_challenge_enrollments (application_id);

CREATE TABLE IF NOT EXISTS challenge_trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID NOT NULL REFERENCES trader_challenge_enrollments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trading_day INTEGER NOT NULL DEFAULT 1,
  trade_date DATE NOT NULL,
  instrument TEXT NOT NULL,
  market TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('buy', 'sell')),
  entry_price NUMERIC(18, 8) NOT NULL,
  exit_price NUMERIC(18, 8) NOT NULL,
  lot_size NUMERIC(18, 4) NOT NULL,
  profit_loss NUMERIC(18, 2) NOT NULL,
  notes TEXT,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'rejected')),
  rejection_reason TEXT,
  review_notes TEXT,
  reviewer_id UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'mt5')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_challenge_trades_enrollment
  ON challenge_trades (enrollment_id, status, trade_date);

CREATE INDEX IF NOT EXISTS idx_challenge_trades_user
  ON challenge_trades (user_id, created_at DESC);

ALTER TABLE challenge_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own challenge trades"
  ON challenge_trades FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own challenge trades"
  ON challenge_trades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own rejected challenge trades"
  ON challenge_trades FOR UPDATE
  USING (auth.uid() = user_id AND status = 'rejected');

CREATE POLICY "Admins manage challenge trades"
  ON challenge_trades FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'administrator'
    )
  );

CREATE TRIGGER challenge_trades_updated_at
  BEFORE UPDATE ON challenge_trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
