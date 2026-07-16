-- =============================================================================
-- Investor Dashboard Extensions
-- Investment duration, available balance, trader challenge, trade display status
-- =============================================================================

ALTER TABLE investor_portfolios
  ADD COLUMN IF NOT EXISTS investment_duration_days INTEGER,
  ADD COLUMN IF NOT EXISTS investment_start_date DATE,
  ADD COLUMN IF NOT EXISTS investment_maturity_date DATE,
  ADD COLUMN IF NOT EXISTS available_balance NUMERIC(18, 2) NOT NULL DEFAULT 0;

ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS investor_status TEXT,
  ADD COLUMN IF NOT EXISTS current_price NUMERIC(18, 8),
  ADD COLUMN IF NOT EXISTS invested_amount NUMERIC(18, 2);

CREATE TABLE IF NOT EXISTS trader_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fund_id UUID REFERENCES funds(id),
  title TEXT NOT NULL DEFAULT 'RyvonX Trader Challenge',
  description TEXT NOT NULL DEFAULT 'Prove your skill. Pass the challenge and become a funded RyvonX trader.',
  price NUMERIC(18, 2) NOT NULL DEFAULT 0,
  profit_target_pct NUMERIC(8, 4) NOT NULL DEFAULT 0,
  max_daily_loss_pct NUMERIC(8, 4),
  max_overall_loss_pct NUMERIC(8, 4) NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 30,
  rules_summary TEXT,
  button_text TEXT NOT NULL DEFAULT 'Start Challenge',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trader_challenges_active
  ON trader_challenges (fund_id, is_active);

ALTER TABLE trader_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active trader challenges"
  ON trader_challenges FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage trader challenges"
  ON trader_challenges FOR ALL
  USING (get_user_role() = 'administrator');

INSERT INTO trader_challenges (
  fund_id,
  title,
  description,
  price,
  profit_target_pct,
  max_overall_loss_pct,
  duration_days,
  rules_summary,
  button_text,
  is_active
)
SELECT
  '00000000-0000-4000-a000-000000000001',
  'RyvonX Trader Challenge',
  'Prove your skill. Pass the challenge and become a funded RyvonX trader.',
  199.00,
  10.0000,
  5.0000,
  30,
  'No daily loss limit, Overall loss limit 5%, Profit target 10%, One-time fee.',
  'Start Challenge',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM trader_challenges
  WHERE fund_id = '00000000-0000-4000-a000-000000000001'
);
