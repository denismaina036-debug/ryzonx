-- =============================================================================
-- Ryvonx Admin Portal Extensions
-- Daily snapshots, testimonials, extended fund/transaction fields
-- =============================================================================
--
-- PREREQUISITES — run these migrations FIRST (in order):
--   1. 00001_initial_schema.sql
--   2. 00002_multi_fund_architecture.sql   ← creates the "funds" table
--   3. 00003_public_transaction_feed.sql
--
-- If you see "relation funds does not exist", run 00001 and 00002 first.
-- This is NOT a naming/rebrand issue — the table name is still "funds".
-- =============================================================================

ALTER TABLE funds
  ADD COLUMN IF NOT EXISTS min_investment NUMERIC(18, 2) NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS max_investment NUMERIC(18, 2),
  ADD COLUMN IF NOT EXISTS pool_value NUMERIC(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assets_under_management NUMERIC(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_investors INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_roi NUMERIC(8, 4) NOT NULL DEFAULT 0;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_proof TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS destination TEXT;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active', 'suspended', 'frozen'));

-- -----------------------------------------------------------------------------
-- Daily Fund Snapshots (immutable after lock)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_fund_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fund_id UUID NOT NULL REFERENCES funds(id),
  snapshot_date DATE NOT NULL,
  opening_pool_value NUMERIC(18, 2) NOT NULL,
  closing_pool_value NUMERIC(18, 2) NOT NULL,
  daily_roi NUMERIC(8, 4) NOT NULL DEFAULT 0,
  daily_profit_loss NUMERIC(18, 2) NOT NULL DEFAULT 0,
  trades_count INTEGER NOT NULL DEFAULT 0,
  winning_trades INTEGER NOT NULL DEFAULT 0,
  losing_trades INTEGER NOT NULL DEFAULT 0,
  win_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  deposits_received NUMERIC(18, 2) NOT NULL DEFAULT 0,
  withdrawals_processed NUMERIC(18, 2) NOT NULL DEFAULT 0,
  active_investors INTEGER NOT NULL DEFAULT 0,
  assets_under_management NUMERIC(18, 2) NOT NULL DEFAULT 0,
  manager_notes TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  locked_by UUID REFERENCES profiles(id),
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fund_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_snapshots_fund_date
  ON daily_fund_snapshots (fund_id, snapshot_date DESC);

-- -----------------------------------------------------------------------------
-- Testimonials
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  return_rate NUMERIC(8, 4),
  is_published BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
ALTER TABLE daily_fund_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage daily snapshots"
  ON daily_fund_snapshots FOR ALL
  USING (get_user_role() = 'administrator');

CREATE POLICY "Public can view locked snapshots"
  ON daily_fund_snapshots FOR SELECT
  USING (is_locked = true);

CREATE POLICY "Public can view published testimonials"
  ON testimonials FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins manage testimonials"
  ON testimonials FOR ALL
  USING (get_user_role() = 'administrator');

CREATE TRIGGER testimonials_updated_at BEFORE UPDATE ON testimonials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
