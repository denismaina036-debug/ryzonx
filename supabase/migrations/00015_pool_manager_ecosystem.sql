-- =============================================================================
-- Pool Manager Ecosystem — architecture foundation
-- `funds` is the canonical Pool entity (pool_id === fund_id).
-- Extends multi-pool support with approved Pool Managers and relational integrity.
-- =============================================================================

-- Expand fund/pool status values used by admin without breaking existing rows
ALTER TABLE funds DROP CONSTRAINT IF EXISTS funds_status_check;
ALTER TABLE funds ADD CONSTRAINT funds_status_check
  CHECK (status IN ('active', 'inactive', 'closed', 'paused', 'archived'));

COMMENT ON TABLE funds IS
  'Canonical Pool entity for the RyvonX marketplace. fund_id === pool_id throughout the platform.';

-- -----------------------------------------------------------------------------
-- Pool Managers — approved professionals who operate pools under RyvonX governance
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pool_managers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  icon_url TEXT,
  bio TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'suspended', 'revoked')),
  is_platform_managed BOOLEAN NOT NULL DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pool_managers_user ON pool_managers(user_id);
CREATE INDEX IF NOT EXISTS idx_pool_managers_status ON pool_managers(status);

CREATE TRIGGER pool_managers_updated_at
  BEFORE UPDATE ON pool_managers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE pool_managers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view approved pool managers" ON pool_managers;
CREATE POLICY "Anyone can view approved pool managers"
  ON pool_managers FOR SELECT
  USING (status = 'approved');

DROP POLICY IF EXISTS "Admins manage pool managers" ON pool_managers;
CREATE POLICY "Admins manage pool managers"
  ON pool_managers FOR ALL
  USING (get_user_role() = 'administrator');

-- Link every pool to a Pool Manager (nullable during transition, backfilled below)
ALTER TABLE funds
  ADD COLUMN IF NOT EXISTS pool_manager_id UUID REFERENCES pool_managers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_funds_pool_manager ON funds(pool_manager_id);

-- Platform-managed manager for the default RyvonX pool
INSERT INTO pool_managers (
  id,
  display_name,
  icon_url,
  bio,
  status,
  is_platform_managed,
  approved_at
)
VALUES (
  '00000000-0000-4000-a000-000000000010',
  'RyvonX Trading Desk',
  NULL,
  'Official RyvonX platform-managed pool operator.',
  'approved',
  true,
  now()
)
ON CONFLICT (id) DO NOTHING;

UPDATE funds
SET pool_manager_id = '00000000-0000-4000-a000-000000000010'
WHERE id = '00000000-0000-4000-a000-000000000001'
  AND pool_manager_id IS NULL;

-- Backfill display fields on default pool from manager when unset
UPDATE funds f
SET
  pool_manager_name = COALESCE(f.pool_manager_name, pm.display_name),
  pool_manager_icon_url = COALESCE(f.pool_manager_icon_url, pm.icon_url)
FROM pool_managers pm
WHERE f.pool_manager_id = pm.id
  AND f.pool_manager_name IS NULL;

-- -----------------------------------------------------------------------------
-- pool_investments view — investments scoped to a pool (investor_portfolios)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW pool_investments AS
SELECT
  ip.user_id,
  ip.fund_id AS pool_id,
  ip.total_invested,
  ip.current_value,
  ip.ownership_percentage,
  ip.unrealized_pnl,
  ip.realized_pnl,
  ip.total_deposits,
  ip.total_withdrawals,
  ip.available_balance,
  ip.investment_start_date,
  ip.investment_maturity_date,
  ip.investment_duration_days,
  ip.updated_at
FROM investor_portfolios ip;

COMMENT ON VIEW pool_investments IS
  'Investor allocations per pool. pool_id references funds.id.';

-- -----------------------------------------------------------------------------
-- Document pool-scoped entities (fund_id === pool_id)
-- -----------------------------------------------------------------------------
COMMENT ON COLUMN trades.fund_id IS 'Pool this trade belongs to (funds.id).';
COMMENT ON COLUMN transactions.fund_id IS 'Pool this deposit/withdrawal/adjustment belongs to (funds.id).';
COMMENT ON COLUMN investor_portfolios.fund_id IS 'Pool this investment allocation belongs to (funds.id).';
COMMENT ON COLUMN performance_snapshots.fund_id IS 'Pool this performance record belongs to (funds.id).';
COMMENT ON COLUMN pool_stats.fund_id IS 'Pool these ROI metrics belong to (funds.id).';
COMMENT ON COLUMN daily_fund_snapshots.fund_id IS 'Pool this daily snapshot belongs to (funds.id).';

-- Ensure default pool remains the platform default
UPDATE funds
SET is_default = false
WHERE id <> '00000000-0000-4000-a000-000000000001'
  AND is_default = true;

UPDATE funds
SET is_default = true,
    name = COALESCE(NULLIF(name, ''), 'Ryvonx Main Pool'),
    slug = COALESCE(NULLIF(slug, ''), 'ryvonx-main-pool'),
    status = CASE WHEN status = 'archived' THEN 'active' ELSE status END
WHERE id = '00000000-0000-4000-a000-000000000001';
