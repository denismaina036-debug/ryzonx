-- Cycle independence: per-cycle profit wallets, cycle target investors, post-cycle settlement choices

ALTER TABLE investment_cycles
  ADD COLUMN IF NOT EXISTS target_investors INTEGER CHECK (target_investors IS NULL OR target_investors > 0);

COMMENT ON COLUMN investment_cycles.target_investors IS
  'Maximum investors for this cycle round (may differ from the parent pool).';

ALTER TABLE investor_profit_wallets
  DROP CONSTRAINT IF EXISTS investor_profit_wallets_investor_id_fund_id_key;

ALTER TABLE investor_profit_wallets
  ADD COLUMN IF NOT EXISTS source_cycle_id UUID REFERENCES investment_cycles(id) ON DELETE SET NULL;

COMMENT ON COLUMN investor_profit_wallets.source_cycle_id IS
  'When set, profit balance belongs to a specific completed cycle only.';

DROP INDEX IF EXISTS idx_investor_profit_wallets_investor_fund;
CREATE UNIQUE INDEX IF NOT EXISTS idx_investor_profit_wallets_investor_fund_cycle
  ON investor_profit_wallets(investor_id, fund_id, COALESCE(source_cycle_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE TYPE cycle_investor_settlement_status AS ENUM (
  'pending_choice',
  'profit_transferred',
  'profit_reinvested',
  'capital_reinvested',
  'capital_withdrawal_requested',
  'capital_withdrawn',
  'closed'
);

CREATE TABLE IF NOT EXISTS cycle_investor_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_cycle_id UUID NOT NULL REFERENCES investment_cycles(id) ON DELETE CASCADE,
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  principal_amount NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (principal_amount >= 0),
  profit_amount NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (profit_amount >= 0),
  status cycle_investor_settlement_status NOT NULL DEFAULT 'pending_choice',
  profit_resolved BOOLEAN NOT NULL DEFAULT false,
  capital_resolved BOOLEAN NOT NULL DEFAULT false,
  capital_withdrawal_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cycle_investor_settlements_unique UNIQUE (investment_cycle_id, investor_id)
);

CREATE INDEX IF NOT EXISTS idx_cycle_investor_settlements_investor
  ON cycle_investor_settlements(investor_id, status);

CREATE INDEX IF NOT EXISTS idx_cycle_investor_settlements_cycle
  ON cycle_investor_settlements(investment_cycle_id);

ALTER TABLE cycle_investor_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY cycle_investor_settlements_investor_read ON cycle_investor_settlements
  FOR SELECT USING (auth.uid() = investor_id);

CREATE TRIGGER cycle_investor_settlements_updated_at
  BEFORE UPDATE ON cycle_investor_settlements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
