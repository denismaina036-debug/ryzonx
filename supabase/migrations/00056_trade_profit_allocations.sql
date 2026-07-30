-- =============================================================================
-- Migration 056: Pro-rata profit allocation on winning trades
-- =============================================================================

ALTER TABLE trade_entries
  ADD COLUMN IF NOT EXISTS profit_applied_at TIMESTAMPTZ;

COMMENT ON COLUMN trade_entries.profit_applied_at IS
  'When proportional investor capital credit was applied for this winning trade.';

CREATE TABLE IF NOT EXISTS trade_profit_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_entry_id UUID NOT NULL REFERENCES trade_entries(id) ON DELETE CASCADE,
  investment_cycle_id UUID NOT NULL REFERENCES investment_cycles(id) ON DELETE RESTRICT,
  investment_allocation_id UUID NOT NULL REFERENCES investment_allocations(id) ON DELETE RESTRICT,
  investor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  profit_amount NUMERIC(18, 2) NOT NULL CHECK (profit_amount > 0),
  ownership_pct NUMERIC(10, 6) NOT NULL CHECK (ownership_pct >= 0),
  previous_amount NUMERIC(18, 2) NOT NULL CHECK (previous_amount >= 0),
  new_amount NUMERIC(18, 2) NOT NULL CHECK (new_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trade_entry_id, investment_allocation_id)
);

CREATE INDEX IF NOT EXISTS idx_trade_profit_allocations_cycle
  ON trade_profit_allocations(investment_cycle_id);
CREATE INDEX IF NOT EXISTS idx_trade_profit_allocations_trade
  ON trade_profit_allocations(trade_entry_id);

COMMENT ON TABLE trade_profit_allocations IS
  'Audit trail for proportional investor capital credits on winning trades.';
