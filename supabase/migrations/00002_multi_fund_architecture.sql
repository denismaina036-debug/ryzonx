-- =============================================================================
-- Ryvonx Multi-Fund Architecture
-- Adds Funds entity; all core records reference a fund.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Funds
-- -----------------------------------------------------------------------------
CREATE TABLE funds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'closed')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default fund
INSERT INTO funds (id, name, slug, description, status, is_default)
VALUES (
  '00000000-0000-4000-a000-000000000001',
  'Ryvonx Main Pool',
  'ryvonx-main-pool',
  'Our flagship professionally managed trading pool.',
  'active',
  true
);

-- -----------------------------------------------------------------------------
-- Add fund_id to existing tables
-- -----------------------------------------------------------------------------

ALTER TABLE pool_stats ADD COLUMN fund_id UUID REFERENCES funds(id);
UPDATE pool_stats SET fund_id = '00000000-0000-4000-a000-000000000001' WHERE fund_id IS NULL;
ALTER TABLE pool_stats ALTER COLUMN fund_id SET NOT NULL;
ALTER TABLE pool_stats ADD CONSTRAINT pool_stats_fund_id_unique UNIQUE (fund_id);

ALTER TABLE performance_snapshots ADD COLUMN fund_id UUID REFERENCES funds(id);
UPDATE performance_snapshots SET fund_id = '00000000-0000-4000-a000-000000000001' WHERE fund_id IS NULL;
ALTER TABLE performance_snapshots ALTER COLUMN fund_id SET NOT NULL;
ALTER TABLE performance_snapshots DROP CONSTRAINT IF EXISTS performance_snapshots_date_key;
ALTER TABLE performance_snapshots ADD CONSTRAINT performance_snapshots_fund_date_unique UNIQUE (fund_id, date);

ALTER TABLE trades ADD COLUMN fund_id UUID REFERENCES funds(id);
UPDATE trades SET fund_id = '00000000-0000-4000-a000-000000000001' WHERE fund_id IS NULL;
ALTER TABLE trades ALTER COLUMN fund_id SET NOT NULL;

ALTER TABLE journal_entries ADD COLUMN fund_id UUID REFERENCES funds(id);
UPDATE journal_entries SET fund_id = '00000000-0000-4000-a000-000000000001' WHERE fund_id IS NULL;
ALTER TABLE journal_entries ALTER COLUMN fund_id SET NOT NULL;

ALTER TABLE investor_portfolios ADD COLUMN fund_id UUID REFERENCES funds(id);
UPDATE investor_portfolios SET fund_id = '00000000-0000-4000-a000-000000000001' WHERE fund_id IS NULL;
ALTER TABLE investor_portfolios ALTER COLUMN fund_id SET NOT NULL;
ALTER TABLE investor_portfolios DROP CONSTRAINT IF EXISTS investor_portfolios_pkey;
ALTER TABLE investor_portfolios ADD PRIMARY KEY (user_id, fund_id);

ALTER TABLE transactions ADD COLUMN fund_id UUID REFERENCES funds(id);
UPDATE transactions SET fund_id = '00000000-0000-4000-a000-000000000001' WHERE fund_id IS NULL;
ALTER TABLE transactions ALTER COLUMN fund_id SET NOT NULL;

ALTER TABLE announcements ADD COLUMN fund_id UUID REFERENCES funds(id);
UPDATE announcements SET fund_id = '00000000-0000-4000-a000-000000000001' WHERE fund_id IS NULL;
ALTER TABLE announcements ALTER COLUMN fund_id SET NOT NULL;

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX idx_pool_stats_fund ON pool_stats(fund_id);
CREATE INDEX idx_performance_fund_date ON performance_snapshots(fund_id, date DESC);
CREATE INDEX idx_trades_fund ON trades(fund_id);
CREATE INDEX idx_transactions_fund ON transactions(fund_id);
CREATE INDEX idx_investor_portfolios_fund ON investor_portfolios(fund_id);

-- -----------------------------------------------------------------------------
-- RLS for funds
-- -----------------------------------------------------------------------------
ALTER TABLE funds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active funds"
  ON funds FOR SELECT USING (status = 'active');
CREATE POLICY "Admins can manage funds"
  ON funds FOR ALL USING (get_user_role() = 'administrator');

CREATE TRIGGER funds_updated_at BEFORE UPDATE ON funds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
