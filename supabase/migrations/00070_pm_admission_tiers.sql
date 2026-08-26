-- Dynamic Pool Manager admission tiers for Challenge and Instant Access.
-- Existing applications remain valid: tier columns are nullable and their
-- admission_fee_amount continues to be the authoritative payment snapshot.

CREATE TABLE IF NOT EXISTS pm_admission_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  max_capital NUMERIC(18, 2) NOT NULL CHECK (max_capital > 0 AND max_capital <= 1000000),
  challenge_fee NUMERIC(12, 2) NOT NULL CHECK (challenge_fee >= 0),
  instant_access_fee NUMERIC(12, 2) NOT NULL CHECK (instant_access_fee >= 0),
  challenge_template_id UUID REFERENCES challenge_templates(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pm_admission_tiers_instant_premium CHECK (instant_access_fee >= challenge_fee),
  CONSTRAINT pm_admission_tiers_name_nonempty CHECK (char_length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_pm_admission_tiers_public
  ON pm_admission_tiers (is_active, sort_order);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pm_admission_tiers_featured
  ON pm_admission_tiers (is_featured)
  WHERE is_featured = true;

ALTER TABLE pool_manager_applications
  ADD COLUMN IF NOT EXISTS admission_tier_id UUID REFERENCES pm_admission_tiers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admission_tier_snapshot JSONB;

CREATE INDEX IF NOT EXISTS idx_pm_applications_admission_tier
  ON pool_manager_applications (admission_tier_id);

ALTER TABLE pool_managers
  ADD COLUMN IF NOT EXISTS admission_tier_id UUID REFERENCES pm_admission_tiers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS capital_limit_amount NUMERIC(18, 2)
    CHECK (capital_limit_amount IS NULL OR (capital_limit_amount > 0 AND capital_limit_amount <= 1000000));

CREATE INDEX IF NOT EXISTS idx_pool_managers_admission_tier
  ON pool_managers (admission_tier_id);

-- Seed a professional one-phase evaluation for every capital tier. Admins may
-- edit these through the existing Challenge Template manager at any time.
INSERT INTO challenge_templates (
  slug, name, status, description, starting_balance, currency, platform,
  default_broker, profit_target_pct, min_trading_days, max_evaluation_days,
  min_closed_trades, max_overall_drawdown_pct, max_daily_drawdown_pct,
  max_risk_per_trade_pct, max_total_exposure_pct, max_simultaneous_positions,
  trading_rules, trade_requirements, trading_journal, evaluation_criteria,
  automatic_failure_conditions, is_default
)
SELECT
  'ryvonx-' || seed.slug || '-one-phase',
  'RyvonX ' || seed.name || ' One-Phase Challenge',
  'active',
  seed.description,
  seed.starting_balance,
  'USD',
  'MetaTrader 5 (MT5)',
  'Pepperstone',
  seed.profit_target,
  seed.min_days,
  30,
  seed.min_trades,
  seed.max_drawdown,
  seed.daily_drawdown,
  seed.risk_per_trade,
  seed.total_exposure,
  seed.positions,
  '{"weekendHolding":"allowed","newsTrading":"allowed","hedging":"allowed","expertAdvisors":"not_allowed","copyTrading":"not_allowed","gridTrading":"not_allowed","martingale":"not_allowed"}'::jsonb,
  '{"requireStopLoss":true,"requireTakeProfit":true,"strategyNote":"Trade only the strategy approved in your RyvonX Pool Manager application."}'::jsonb,
  '{"required":true,"fields":["Trade rationale","Entry analysis","Exit analysis","Outcome","Lessons learned"]}'::jsonb,
  '{"riskManagement":30,"tradingDiscipline":25,"strategyConsistency":20,"tradingJournalQuality":15,"profitability":10}'::jsonb,
  '["Breaches Daily Drawdown","Breaches Maximum Drawdown","Uses Martingale","Uses prohibited Grid Trading","Uses unauthorized Expert Advisors","Uses Copy Trading","Shares account credentials","Manipulates trading records","Violates RyvonX policies"]'::jsonb,
  false
FROM (VALUES
  ('starter', 'Starter', 'An accessible one-phase evaluation focused on sound habits and capital protection.', 20000::numeric, 6::numeric, 3, 8, 10::numeric, 5::numeric, 2::numeric, 6::numeric, 5),
  ('intermediate', 'Intermediate', 'A balanced evaluation for traders progressing toward professional mandates.', 50000::numeric, 7::numeric, 4, 10, 9::numeric, 4.5::numeric, 1.75::numeric, 5::numeric, 5),
  ('advanced', 'Advanced', 'A professional evaluation of consistent execution and controlled risk.', 100000::numeric, 8::numeric, 5, 12, 8::numeric, 4::numeric, 1.5::numeric, 5::numeric, 4),
  ('professional', 'Professional', 'A demanding evaluation for established managers seeking substantial capital.', 250000::numeric, 9::numeric, 5, 15, 7::numeric, 3.5::numeric, 1.25::numeric, 4::numeric, 4),
  ('elite', 'Elite', 'RyvonX''s highest-discipline evaluation for exceptional capital managers.', 1000000::numeric, 10::numeric, 5, 20, 6::numeric, 3::numeric, 1::numeric, 3::numeric, 3)
) AS seed(slug, name, description, starting_balance, profit_target, min_days, min_trades, max_drawdown, daily_drawdown, risk_per_trade, total_exposure, positions)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO pm_admission_tiers (
  slug, name, description, max_capital, challenge_fee, instant_access_fee,
  challenge_template_id, is_active, is_featured, sort_order
)
SELECT seed.slug, seed.name, seed.description, seed.max_capital,
       seed.challenge_fee, seed.instant_access_fee, template.id,
       true, seed.is_featured, seed.sort_order
FROM (VALUES
  ('starter', 'Starter', 'Build your RyvonX track record with a focused capital mandate.', 20000::numeric, 100::numeric, 150::numeric, false, 10),
  ('intermediate', 'Intermediate', 'Step into a broader mandate with balanced professional expectations.', 50000::numeric, 150::numeric, 200::numeric, true, 20),
  ('advanced', 'Advanced', 'For proven traders ready to manage meaningful investor capital.', 100000::numeric, 200::numeric, 300::numeric, false, 30),
  ('professional', 'Professional', 'A substantial mandate for disciplined, established trading professionals.', 250000::numeric, 300::numeric, 400::numeric, false, 40),
  ('elite', 'Elite', 'RyvonX''s highest admission tier for exceptional capital managers.', 1000000::numeric, 350::numeric, 499::numeric, false, 50)
) AS seed(slug, name, description, max_capital, challenge_fee, instant_access_fee, is_featured, sort_order)
LEFT JOIN challenge_templates template ON template.slug = 'ryvonx-' || seed.slug || '-one-phase'
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE pm_admission_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads active PM admission tiers" ON pm_admission_tiers;
CREATE POLICY "Anyone reads active PM admission tiers"
  ON pm_admission_tiers FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage PM admission tiers" ON pm_admission_tiers;
CREATE POLICY "Admins manage PM admission tiers"
  ON pm_admission_tiers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'administrator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'administrator'
    )
  );

DROP TRIGGER IF EXISTS pm_admission_tiers_updated_at ON pm_admission_tiers;
CREATE TRIGGER pm_admission_tiers_updated_at
  BEFORE UPDATE ON pm_admission_tiers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

REVOKE INSERT, UPDATE, DELETE ON pm_admission_tiers FROM anon, authenticated;
