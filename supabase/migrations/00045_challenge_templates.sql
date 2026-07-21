-- Challenge Template System: reusable evaluation rules for Pool Manager challenges

CREATE TABLE IF NOT EXISTS challenge_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'archived')),
  description TEXT,
  starting_balance NUMERIC(18, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  platform TEXT NOT NULL,
  default_broker TEXT NOT NULL,
  profit_target_pct NUMERIC(8, 4) NOT NULL,
  min_trading_days INTEGER NOT NULL,
  max_evaluation_days INTEGER NOT NULL,
  min_closed_trades INTEGER NOT NULL,
  max_overall_drawdown_pct NUMERIC(8, 4) NOT NULL,
  max_daily_drawdown_pct NUMERIC(8, 4) NOT NULL,
  max_risk_per_trade_pct NUMERIC(8, 4) NOT NULL,
  max_total_exposure_pct NUMERIC(8, 4) NOT NULL,
  max_simultaneous_positions INTEGER NOT NULL,
  trading_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  trade_requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  trading_journal JSONB NOT NULL DEFAULT '{}'::jsonb,
  evaluation_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  automatic_failure_conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_challenge_templates_status
  ON challenge_templates (status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_challenge_templates_default
  ON challenge_templates (is_default)
  WHERE is_default = true;

ALTER TABLE pool_manager_applications
  ADD COLUMN IF NOT EXISTS challenge_template_id UUID
    REFERENCES challenge_templates(id) ON DELETE SET NULL;

ALTER TABLE trader_challenge_enrollments
  ADD COLUMN IF NOT EXISTS challenge_template_id UUID
    REFERENCES challenge_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS account_password TEXT,
  ADD COLUMN IF NOT EXISTS account_investor_password TEXT,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pm_applications_challenge_template
  ON pool_manager_applications (challenge_template_id);

CREATE INDEX IF NOT EXISTS idx_challenge_enrollments_template
  ON trader_challenge_enrollments (challenge_template_id);

INSERT INTO challenge_templates (
  slug,
  name,
  status,
  description,
  starting_balance,
  currency,
  platform,
  default_broker,
  profit_target_pct,
  min_trading_days,
  max_evaluation_days,
  min_closed_trades,
  max_overall_drawdown_pct,
  max_daily_drawdown_pct,
  max_risk_per_trade_pct,
  max_total_exposure_pct,
  max_simultaneous_positions,
  trading_rules,
  trade_requirements,
  trading_journal,
  evaluation_criteria,
  automatic_failure_conditions,
  is_default
) VALUES (
  'ryvonx-standard-challenge',
  'RyvonX Standard Challenge',
  'active',
  'Standard evaluation challenge for new Pool Manager applicants.',
  2000,
  'USD',
  'MetaTrader 5 (MT5)',
  'Pepperstone',
  10,
  5,
  30,
  20,
  10,
  5,
  2,
  5,
  5,
  '{
    "weekendHolding": "allowed",
    "newsTrading": "allowed",
    "hedging": "allowed",
    "expertAdvisors": "not_allowed",
    "copyTrading": "not_allowed",
    "gridTrading": "not_allowed",
    "martingale": "not_allowed"
  }'::jsonb,
  '{
    "requireStopLoss": true,
    "requireTakeProfit": true,
    "strategyNote": "Applicants are expected to follow the trading strategy submitted during their Pool Manager application."
  }'::jsonb,
  '{
    "required": true,
    "fields": [
      "Trade rationale",
      "Entry analysis",
      "Exit analysis",
      "Outcome",
      "Lessons learned"
    ]
  }'::jsonb,
  '{
    "riskManagement": 30,
    "tradingDiscipline": 25,
    "strategyConsistency": 20,
    "tradingJournalQuality": 15,
    "profitability": 10
  }'::jsonb,
  '[
    "Exceeds 10% Overall Drawdown",
    "Exceeds 5% Daily Drawdown",
    "Uses Martingale",
    "Uses prohibited Grid Trading",
    "Uses unauthorized Expert Advisors",
    "Uses Copy Trading",
    "Shares account credentials",
    "Manipulates trading records",
    "Violates RyvonX policies"
  ]'::jsonb,
  true
)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE challenge_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage challenge templates"
  ON challenge_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'administrator'
    )
  );

CREATE POLICY "Authenticated users read active challenge templates"
  ON challenge_templates FOR SELECT
  USING (status = 'active');

CREATE TRIGGER challenge_templates_updated_at
  BEFORE UPDATE ON challenge_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
