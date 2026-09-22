-- Immutable copier-facing trade history. This table records the result
-- projected by the existing settlement calculator and never moves money.
CREATE TABLE IF NOT EXISTS copier_trade_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_entry_id UUID NOT NULL REFERENCES trade_entries(id) ON DELETE RESTRICT,
  investment_cycle_id UUID NOT NULL REFERENCES investment_cycles(id) ON DELETE RESTRICT,
  investment_allocation_id UUID NOT NULL REFERENCES investment_allocations(id) ON DELETE RESTRICT,
  investor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  result_amount NUMERIC(18, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT copier_trade_results_trade_allocation_unique
    UNIQUE (trade_entry_id, investment_allocation_id)
);

CREATE INDEX IF NOT EXISTS idx_copier_trade_results_investor_created
  ON copier_trade_results(investor_id, created_at DESC);

ALTER TABLE copier_trade_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS copier_trade_results_owner_read ON copier_trade_results;
CREATE POLICY copier_trade_results_owner_read ON copier_trade_results
  FOR SELECT USING (auth.uid() = investor_id);

REVOKE INSERT, UPDATE, DELETE ON copier_trade_results FROM anon, authenticated;
