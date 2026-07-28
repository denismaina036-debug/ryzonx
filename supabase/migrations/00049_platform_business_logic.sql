-- =============================================================================
-- Migration 049: Platform business logic — loss trades, admin stats, security
-- =============================================================================

CREATE TYPE trade_entry_result AS ENUM ('profit', 'loss', 'breakeven');

ALTER TABLE trade_entries
  ADD COLUMN IF NOT EXISTS trade_result trade_entry_result,
  ADD COLUMN IF NOT EXISTS realized_pnl NUMERIC(18, 2),
  ADD COLUMN IF NOT EXISTS loss_applied_at TIMESTAMPTZ;

COMMENT ON COLUMN trade_entries.trade_result IS 'Profit, loss, or breakeven outcome when the trade is closed.';
COMMENT ON COLUMN trade_entries.realized_pnl IS 'Signed realized P/L in USD at close.';
COMMENT ON COLUMN trade_entries.loss_applied_at IS 'When proportional investor write-down was applied for this loss trade.';

-- Allow admin-defined pool security labels and custom percentages (e.g. 98%).
ALTER TABLE funds DROP CONSTRAINT IF EXISTS funds_security_rating_check;

COMMENT ON COLUMN funds.security_rating IS
  'Admin-controlled security label or custom percentage (e.g. very_safe, 98%, Very High).';

ALTER TABLE pool_managers
  ADD COLUMN IF NOT EXISTS admin_statistics JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN pool_managers.admin_statistics IS
  'Admin-editable statistic overrides merged over live metrics on public surfaces.';

-- Profit settlements must support net losses at cycle end.
ALTER TABLE profit_settlements
  DROP CONSTRAINT IF EXISTS profit_settlements_net_distributable_profit_check,
  DROP CONSTRAINT IF EXISTS profit_settlements_investor_distribution_total_check,
  DROP CONSTRAINT IF EXISTS profit_settlements_pool_manager_earnings_check;

ALTER TABLE profit_settlement_allocations
  DROP CONSTRAINT IF EXISTS profit_settlement_allocations_profit_share_check;

CREATE TABLE IF NOT EXISTS trade_loss_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_entry_id UUID NOT NULL REFERENCES trade_entries(id) ON DELETE CASCADE,
  investment_cycle_id UUID NOT NULL REFERENCES investment_cycles(id) ON DELETE RESTRICT,
  investment_allocation_id UUID NOT NULL REFERENCES investment_allocations(id) ON DELETE RESTRICT,
  investor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  loss_amount NUMERIC(18, 2) NOT NULL CHECK (loss_amount > 0),
  ownership_pct NUMERIC(10, 6) NOT NULL CHECK (ownership_pct >= 0),
  previous_amount NUMERIC(18, 2) NOT NULL CHECK (previous_amount >= 0),
  new_amount NUMERIC(18, 2) NOT NULL CHECK (new_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trade_entry_id, investment_allocation_id)
);

CREATE INDEX IF NOT EXISTS idx_trade_loss_allocations_cycle
  ON trade_loss_allocations(investment_cycle_id);
CREATE INDEX IF NOT EXISTS idx_trade_loss_allocations_trade
  ON trade_loss_allocations(trade_entry_id);

COMMENT ON TABLE trade_loss_allocations IS
  'Audit trail for proportional investor capital write-downs on losing trades.';
