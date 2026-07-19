-- =============================================================================
-- Migration 026: Core Investment Domain — Investment Allocations
-- Links investors to investment cycles. Model-only in Phase 3 (no deposit wiring).
-- Architecture: 09_DATABASE_RELATIONSHIPS.md §9
-- =============================================================================

CREATE TYPE investment_allocation_status AS ENUM (
  'pending',
  'confirmed',
  'locked',
  'distributed',
  'cancelled'
);

CREATE TABLE IF NOT EXISTS investment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_cycle_id UUID NOT NULL REFERENCES investment_cycles(id) ON DELETE RESTRICT,
  investor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status investment_allocation_status NOT NULL DEFAULT 'pending',
  reference_number TEXT NOT NULL,
  allocated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT investment_allocations_reference_unique UNIQUE (reference_number),
  CONSTRAINT investment_allocations_investor_cycle_unique UNIQUE (investment_cycle_id, investor_id)
);

COMMENT ON TABLE investment_allocations IS
  'Investor commitment to an Investment Cycle. Becomes immutable when cycle enters trading.';

CREATE INDEX IF NOT EXISTS idx_investment_allocations_cycle ON investment_allocations(investment_cycle_id);
CREATE INDEX IF NOT EXISTS idx_investment_allocations_investor ON investment_allocations(investor_id);
CREATE INDEX IF NOT EXISTS idx_investment_allocations_status ON investment_allocations(status);

CREATE TRIGGER investment_allocations_updated_at
  BEFORE UPDATE ON investment_allocations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
