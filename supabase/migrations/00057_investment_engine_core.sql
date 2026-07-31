-- =============================================================================
-- Migration 057: RyvonX Core Investment Engine
-- Pool capital, ownership snapshots, investment queue, profit wallets
-- =============================================================================

CREATE TYPE investment_queue_type AS ENUM ('investment', 'withdrawal', 'reinvestment');
CREATE TYPE investment_queue_status AS ENUM ('pending', 'processed', 'cancelled');

-- Canonical per-investor pool capital (real + virtual seed investors)
CREATE TABLE IF NOT EXISTS pool_investor_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  investor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_virtual BOOLEAN NOT NULL DEFAULT false,
  virtual_label TEXT,
  capital NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (capital >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pool_investor_positions_virtual_label_chk CHECK (
    (is_virtual = true AND virtual_label IS NOT NULL) OR (is_virtual = false AND investor_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pool_investor_positions_real
  ON pool_investor_positions(fund_id, investor_id)
  WHERE is_virtual = false AND investor_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pool_investor_positions_virtual
  ON pool_investor_positions(fund_id, virtual_label)
  WHERE is_virtual = true;

CREATE INDEX IF NOT EXISTS idx_pool_investor_positions_fund
  ON pool_investor_positions(fund_id);

-- Queued investments / withdrawals / reinvestments during active trading
CREATE TABLE IF NOT EXISTS investment_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  queue_type investment_queue_type NOT NULL,
  amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
  status investment_queue_status NOT NULL DEFAULT 'pending',
  target_cycle_id UUID REFERENCES investment_cycles(id) ON DELETE SET NULL,
  source_settlement_id UUID REFERENCES profit_settlements(id) ON DELETE SET NULL,
  notes TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_investment_queue_fund_status
  ON investment_queue(fund_id, status);
CREATE INDEX IF NOT EXISTS idx_investment_queue_investor
  ON investment_queue(investor_id);

-- Immutable ownership snapshot when trading begins
CREATE TABLE IF NOT EXISTS cycle_ownership_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_cycle_id UUID NOT NULL REFERENCES investment_cycles(id) ON DELETE CASCADE,
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  investor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_virtual BOOLEAN NOT NULL DEFAULT false,
  virtual_label TEXT,
  capital NUMERIC(18, 2) NOT NULL CHECK (capital >= 0),
  ownership_pct NUMERIC(10, 6) NOT NULL CHECK (ownership_pct >= 0),
  pool_capital_total NUMERIC(18, 2) NOT NULL CHECK (pool_capital_total >= 0),
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cycle_ownership_snapshots_real
  ON cycle_ownership_snapshots(investment_cycle_id, investor_id)
  WHERE is_virtual = false AND investor_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cycle_ownership_snapshots_virtual
  ON cycle_ownership_snapshots(investment_cycle_id, virtual_label)
  WHERE is_virtual = true;

CREATE INDEX IF NOT EXISTS idx_cycle_ownership_snapshots_cycle
  ON cycle_ownership_snapshots(investment_cycle_id);

-- Investor profit wallet — separate from pool capital
CREATE TABLE IF NOT EXISTS investor_profit_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  balance NUMERIC(18, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (investor_id, fund_id)
);

CREATE INDEX IF NOT EXISTS idx_investor_profit_wallets_fund
  ON investor_profit_wallets(fund_id);

-- Admin seed configuration
ALTER TABLE funds
  ADD COLUMN IF NOT EXISTS seed_pool_capital NUMERIC(18, 2),
  ADD COLUMN IF NOT EXISTS seed_investor_count INTEGER;

-- Cached cycle profit (trades accumulate here; pool capital unchanged)
ALTER TABLE investment_cycles
  ADD COLUMN IF NOT EXISTS current_cycle_profit NUMERIC(18, 2) NOT NULL DEFAULT 0;

COMMENT ON TABLE pool_investor_positions IS
  'Canonical pool-level investor capital. Ownership = capital / sum(capital).';
COMMENT ON TABLE investment_queue IS
  'Investments, withdrawals, and reinvestments queued while trading is active.';
COMMENT ON TABLE cycle_ownership_snapshots IS
  'Frozen ownership captured when a trading cycle enters trading status.';
COMMENT ON TABLE investor_profit_wallets IS
  'Settlement profits credited here — separate from pool capital.';

-- Backfill pool capital from existing investor portfolios
INSERT INTO pool_investor_positions (fund_id, investor_id, is_virtual, capital)
SELECT ip.fund_id, ip.user_id, false, ip.total_invested
FROM investor_portfolios ip
WHERE ip.total_invested > 0
  AND ip.fund_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM pool_investor_positions pip
    WHERE pip.fund_id = ip.fund_id
      AND pip.investor_id = ip.user_id
      AND pip.is_virtual = false
  );

-- RLS: service role only for engine tables (admin client bypasses RLS)
ALTER TABLE pool_investor_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_ownership_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_profit_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY pool_investor_positions_investor_read ON pool_investor_positions
  FOR SELECT USING (auth.uid() = investor_id);

CREATE POLICY investor_profit_wallets_investor_read ON investor_profit_wallets
  FOR SELECT USING (auth.uid() = investor_id);

CREATE POLICY investment_queue_investor_read ON investment_queue
  FOR SELECT USING (auth.uid() = investor_id);
