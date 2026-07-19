-- =============================================================================
-- Migration 034: Pool-owned Investment Cycles with configuration snapshots
-- Pools are the primary product; cycles are funding rounds belonging to a pool.
-- =============================================================================

ALTER TABLE funds
  ADD COLUMN IF NOT EXISTS pool_config_version INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN funds.pool_config_version IS
  'Increments when approved pool configuration changes; new cycles inherit the latest version.';

ALTER TABLE investment_cycles
  ADD COLUMN IF NOT EXISTS fund_id UUID REFERENCES funds(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS cycle_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pool_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pool_config_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS opening_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closing_date TIMESTAMPTZ;

COMMENT ON COLUMN investment_cycles.fund_id IS 'Parent pool (funds.id) this cycle belongs to.';
COMMENT ON COLUMN investment_cycles.cycle_number IS 'Sequential cycle index within the pool (1, 2, 3…).';
COMMENT ON COLUMN investment_cycles.pool_version IS 'Snapshot of funds.pool_config_version at cycle creation.';
COMMENT ON COLUMN investment_cycles.pool_config_snapshot IS
  'Immutable snapshot of pool configuration when the cycle was created.';

CREATE INDEX IF NOT EXISTS idx_investment_cycles_fund ON investment_cycles(fund_id);
CREATE INDEX IF NOT EXISTS idx_investment_cycles_fund_status ON investment_cycles(fund_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS investment_cycles_fund_cycle_number_unique
  ON investment_cycles(fund_id, cycle_number)
  WHERE fund_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS investment_cycles_fund_slug_unique
  ON investment_cycles(fund_id, slug)
  WHERE fund_id IS NOT NULL;
