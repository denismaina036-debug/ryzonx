-- =============================================================================
-- Migration 025: Core Investment Domain — Investment Cycles
-- Temporary fundraising/trading periods under an approved Strategy.
-- Architecture: 06_INVESTMENT_CYCLES.md
-- =============================================================================

CREATE TYPE investment_cycle_status AS ENUM (
  'draft',
  'submitted',
  'approved',
  'funding',
  'trading',
  'distribution',
  'completed',
  'archived'
);

CREATE TABLE IF NOT EXISTS investment_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL REFERENCES strategies(id) ON DELETE RESTRICT,
  pool_manager_id UUID NOT NULL REFERENCES pool_managers(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  status investment_cycle_status NOT NULL DEFAULT 'draft',
  target_capital NUMERIC(18, 2) CHECK (target_capital IS NULL OR target_capital >= 0),
  min_investment NUMERIC(18, 2) CHECK (min_investment IS NULL OR min_investment > 0),
  max_capacity NUMERIC(18, 2) CHECK (max_capacity IS NULL OR max_capacity >= 0),
  raised_capital NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (raised_capital >= 0),
  investor_count INTEGER NOT NULL DEFAULT 0 CHECK (investor_count >= 0),
  funding_deadline TIMESTAMPTZ,
  duration_days INTEGER CHECK (duration_days IS NULL OR duration_days > 0),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  funding_started_at TIMESTAMPTZ,
  trading_started_at TIMESTAMPTZ,
  distribution_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT investment_cycles_strategy_slug_unique UNIQUE (strategy_id, slug),
  CONSTRAINT investment_cycles_name_nonempty CHECK (char_length(trim(name)) > 0),
  CONSTRAINT investment_cycles_capacity_bounds CHECK (
    max_capacity IS NULL OR target_capital IS NULL OR max_capacity >= target_capital
  )
);

COMMENT ON TABLE investment_cycles IS
  'One complete investment event under a Strategy. Immutable after completion/archival.';

CREATE INDEX IF NOT EXISTS idx_investment_cycles_strategy ON investment_cycles(strategy_id);
CREATE INDEX IF NOT EXISTS idx_investment_cycles_pool_manager ON investment_cycles(pool_manager_id);
CREATE INDEX IF NOT EXISTS idx_investment_cycles_status ON investment_cycles(status);

CREATE TRIGGER investment_cycles_updated_at
  BEFORE UPDATE ON investment_cycles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
