-- =============================================================================
-- Migration 035: Profit Distribution Engine & Platform Revenue Model
-- 2.5% platform fee on realized trading profits; pool profit-sharing agreements.
-- =============================================================================

ALTER TYPE ledger_transaction_type ADD VALUE IF NOT EXISTS 'profit_settlement';
ALTER TYPE ledger_transaction_type ADD VALUE IF NOT EXISTS 'platform_service_fee';
ALTER TYPE ledger_transaction_type ADD VALUE IF NOT EXISTS 'pool_manager_earnings';
ALTER TYPE ledger_transaction_type ADD VALUE IF NOT EXISTS 'profit_distribution';

CREATE TYPE profit_settlement_status AS ENUM (
  'calculated',
  'pending_review',
  'confirmed',
  'distributing',
  'completed',
  'cancelled'
);

ALTER TABLE funds
  ADD COLUMN IF NOT EXISTS investor_share_pct NUMERIC(5, 2) NOT NULL DEFAULT 80
    CHECK (investor_share_pct > 0 AND investor_share_pct <= 100),
  ADD COLUMN IF NOT EXISTS pool_manager_share_pct NUMERIC(5, 2) NOT NULL DEFAULT 20
    CHECK (pool_manager_share_pct > 0 AND pool_manager_share_pct <= 100);

ALTER TABLE funds
  ADD CONSTRAINT funds_profit_sharing_sum_100 CHECK (
    ROUND(investor_share_pct + pool_manager_share_pct, 2) = 100
  );

COMMENT ON COLUMN funds.investor_share_pct IS
  'Investor share of net profit after RyvonX service fee (percent).';
COMMENT ON COLUMN funds.pool_manager_share_pct IS
  'Pool Manager share of net profit after RyvonX service fee (percent).';

CREATE TABLE IF NOT EXISTS profit_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_cycle_id UUID NOT NULL UNIQUE REFERENCES investment_cycles(id) ON DELETE RESTRICT,
  fund_id UUID REFERENCES funds(id) ON DELETE SET NULL,
  pool_manager_id UUID NOT NULL REFERENCES pool_managers(id) ON DELETE RESTRICT,
  cycle_capital NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (cycle_capital >= 0),
  gross_trading_profit NUMERIC(18, 2) NOT NULL DEFAULT 0,
  platform_service_fee_pct NUMERIC(8, 6) NOT NULL DEFAULT 0.025,
  platform_service_fee NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (platform_service_fee >= 0),
  net_distributable_profit NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (net_distributable_profit >= 0),
  investor_share_pct NUMERIC(5, 2) NOT NULL,
  pool_manager_share_pct NUMERIC(5, 2) NOT NULL,
  investor_distribution_total NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (investor_distribution_total >= 0),
  pool_manager_earnings NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (pool_manager_earnings >= 0),
  status profit_settlement_status NOT NULL DEFAULT 'calculated',
  settlement_date TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  distributed_at TIMESTAMPTZ,
  settlement_ledger_transaction_id UUID REFERENCES ledger_transactions(id) ON DELETE SET NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profit_settlements_cycle ON profit_settlements(investment_cycle_id);
CREATE INDEX IF NOT EXISTS idx_profit_settlements_manager ON profit_settlements(pool_manager_id);
CREATE INDEX IF NOT EXISTS idx_profit_settlements_status ON profit_settlements(status);

CREATE TABLE IF NOT EXISTS profit_settlement_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profit_settlement_id UUID NOT NULL REFERENCES profit_settlements(id) ON DELETE CASCADE,
  investment_allocation_id UUID NOT NULL REFERENCES investment_allocations(id) ON DELETE RESTRICT,
  investor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  capital_basis NUMERIC(18, 2) NOT NULL CHECK (capital_basis >= 0),
  ownership_pct NUMERIC(10, 6) NOT NULL CHECK (ownership_pct >= 0),
  profit_share NUMERIC(18, 2) NOT NULL CHECK (profit_share >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'transferred', 'cancelled')),
  ledger_transaction_id UUID REFERENCES ledger_transactions(id) ON DELETE SET NULL,
  transferred_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profit_settlement_id, investment_allocation_id)
);

CREATE INDEX IF NOT EXISTS idx_profit_settlement_alloc_investor
  ON profit_settlement_allocations(investor_id);

CREATE TABLE IF NOT EXISTS platform_revenue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profit_settlement_id UUID REFERENCES profit_settlements(id) ON DELETE SET NULL,
  investment_cycle_id UUID NOT NULL REFERENCES investment_cycles(id) ON DELETE RESTRICT,
  fund_id UUID REFERENCES funds(id) ON DELETE SET NULL,
  pool_manager_id UUID REFERENCES pool_managers(id) ON DELETE SET NULL,
  amount NUMERIC(18, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ledger_transaction_id UUID REFERENCES ledger_transactions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_revenue_recorded ON platform_revenue_entries(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_cycle ON platform_revenue_entries(investment_cycle_id);

CREATE TRIGGER profit_settlements_updated_at
  BEFORE UPDATE ON profit_settlements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profit_settlement_allocations_updated_at
  BEFORE UPDATE ON profit_settlement_allocations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed platform revenue ledger account
INSERT INTO ledger_accounts (code, name, account_type, owner_type, currency)
VALUES ('PLATFORM_REVENUE', 'RyvonX Platform Service Revenue', 'revenue', 'platform', 'USD')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE profit_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE profit_settlement_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_revenue_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY profit_settlements_admin_all ON profit_settlements
  FOR ALL USING (get_user_role() = 'administrator') WITH CHECK (get_user_role() = 'administrator');

CREATE POLICY profit_settlements_manager_read ON profit_settlements
  FOR SELECT USING (pool_manager_id = get_approved_pool_manager_id());

CREATE POLICY profit_settlement_alloc_admin_all ON profit_settlement_allocations
  FOR ALL USING (get_user_role() = 'administrator') WITH CHECK (get_user_role() = 'administrator');

CREATE POLICY profit_settlement_alloc_investor_read ON profit_settlement_allocations
  FOR SELECT USING (investor_id = auth.uid());

CREATE POLICY profit_settlement_alloc_manager_read ON profit_settlement_allocations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profit_settlements ps
      WHERE ps.id = profit_settlement_allocations.profit_settlement_id
        AND ps.pool_manager_id = get_approved_pool_manager_id()
    )
  );

CREATE POLICY platform_revenue_admin_all ON platform_revenue_entries
  FOR ALL USING (get_user_role() = 'administrator') WITH CHECK (get_user_role() = 'administrator');
