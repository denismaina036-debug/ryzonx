-- =============================================================================
-- Phase 4: Investor Protection & Pool Governance
-- Rules, violations, warnings, reviews, timeline, scoring — admin-controlled
-- =============================================================================

-- Governance lifecycle stage (managers and pools)
ALTER TABLE pool_managers
  ADD COLUMN IF NOT EXISTS governance_stage TEXT NOT NULL DEFAULT 'active'
    CHECK (governance_stage IN (
      'application', 'challenge', 'strategy_review', 'approved', 'active',
      'performance_monitoring', 'review', 'warning', 'probation',
      'restricted', 'suspended', 'removed'
    ));

ALTER TABLE funds
  ADD COLUMN IF NOT EXISTS governance_stage TEXT NOT NULL DEFAULT 'active'
    CHECK (governance_stage IN (
      'application', 'challenge', 'strategy_review', 'approved', 'active',
      'performance_monitoring', 'review', 'warning', 'probation',
      'restricted', 'suspended', 'removed'
    )),
  ADD COLUMN IF NOT EXISTS governance_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS governance_approved BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS under_governance_review BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS on_probation BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS probation_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS probation_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS probation_notes TEXT,
  ADD COLUMN IF NOT EXISTS pause_new_investments BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pause_withdrawals BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS freeze_marketing BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hide_from_marketplace BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_additional_review BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trading_suspended BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
  ADD COLUMN IF NOT EXISTS suspension_notes TEXT,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS next_review_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_frequency TEXT
    CHECK (review_frequency IS NULL OR review_frequency IN (
      'weekly', 'monthly', 'quarterly', 'annual'
    ));

-- Backfill governance flags for live marketplace pools
UPDATE funds
SET
  governance_verified = true,
  governance_approved = true,
  governance_stage = CASE
    WHEN pool_health = 'suspended' THEN 'suspended'
    WHEN pool_health = 'restricted' THEN 'restricted'
    WHEN pool_health = 'warning' THEN 'warning'
    WHEN pool_health = 'watchlist' THEN 'performance_monitoring'
    ELSE 'active'
  END
WHERE is_marketplace_listed = true OR is_default = true;

-- -----------------------------------------------------------------------------
-- Governance rules (platform defaults + per-pool overrides)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pool_governance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID REFERENCES funds(id) ON DELETE CASCADE,
  rule_key TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL CHECK (rule_type IN (
    'max_daily_drawdown', 'max_overall_drawdown', 'max_consecutive_losing_days',
    'max_consecutive_losing_trades', 'min_monthly_return', 'min_win_rate',
    'max_exposure_per_trade', 'max_exposure_per_market', 'max_open_positions',
    'max_daily_trades', 'min_monthly_trading_activity', 'max_weekly_volatility',
    'custom'
  )),
  threshold_value NUMERIC(18, 4),
  threshold_unit TEXT,
  default_severity TEXT NOT NULL DEFAULT 'minor'
    CHECK (default_severity IN ('information', 'minor', 'major', 'critical')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (fund_id, rule_key)
);

CREATE INDEX IF NOT EXISTS idx_pool_governance_rules_fund ON pool_governance_rules(fund_id);

-- -----------------------------------------------------------------------------
-- Rule violations
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pool_governance_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  pool_manager_id UUID REFERENCES pool_managers(id) ON DELETE SET NULL,
  rule_id UUID REFERENCES pool_governance_rules(id) ON DELETE SET NULL,
  rule_key TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  actual_value NUMERIC(18, 4),
  expected_value NUMERIC(18, 4),
  violation_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  severity TEXT NOT NULL DEFAULT 'minor'
    CHECK (severity IN ('information', 'minor', 'major', 'critical')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pool_governance_violations_fund ON pool_governance_violations(fund_id);
CREATE INDEX IF NOT EXISTS idx_pool_governance_violations_status ON pool_governance_violations(status, violation_at DESC);

-- -----------------------------------------------------------------------------
-- Warnings
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pool_governance_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  pool_manager_id UUID REFERENCES pool_managers(id) ON DELETE SET NULL,
  level TEXT NOT NULL DEFAULT 'minor'
    CHECK (level IN ('information', 'minor', 'major', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  reason TEXT,
  admin_notes TEXT,
  required_action TEXT,
  response_deadline TIMESTAMPTZ,
  issued_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pool_governance_warnings_fund ON pool_governance_warnings(fund_id);

-- -----------------------------------------------------------------------------
-- Scheduled / ad-hoc governance reviews
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pool_governance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  pool_manager_id UUID REFERENCES pool_managers(id) ON DELETE SET NULL,
  review_type TEXT NOT NULL DEFAULT 'monthly'
    CHECK (review_type IN ('weekly', 'monthly', 'quarterly', 'annual', 'ad_hoc')),
  review_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  performance_summary TEXT,
  risk_analysis TEXT,
  rule_compliance TEXT,
  investor_growth_summary TEXT,
  capital_growth_summary TEXT,
  observations TEXT,
  strengths TEXT,
  weaknesses TEXT,
  required_improvements TEXT,
  recommendation TEXT,
  final_rating TEXT,
  visibility TEXT NOT NULL DEFAULT 'internal'
    CHECK (visibility IN ('internal', 'investors')),
  committee_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pool_governance_reviews_fund ON pool_governance_reviews(fund_id);
CREATE INDEX IF NOT EXISTS idx_pool_governance_reviews_date ON pool_governance_reviews(review_date DESC);

-- -----------------------------------------------------------------------------
-- Administrator governance scores (manual, multi-category)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pool_governance_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID REFERENCES funds(id) ON DELETE CASCADE,
  pool_manager_id UUID REFERENCES pool_managers(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'consistency', 'capital_preservation', 'professional_conduct', 'transparency',
    'risk_discipline', 'communication', 'investor_satisfaction', 'strategy_adherence',
    'performance_stability', 'long_term_reliability'
  )),
  score NUMERIC(4, 1) NOT NULL CHECK (score >= 0 AND score <= 10),
  notes TEXT,
  scored_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pool_governance_scores_unique
  ON pool_governance_scores(COALESCE(fund_id, '00000000-0000-0000-0000-000000000000'::uuid), category);

-- -----------------------------------------------------------------------------
-- Immutable governance timeline (per pool / manager)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pool_governance_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID REFERENCES funds(id) ON DELETE CASCADE,
  pool_manager_id UUID REFERENCES pool_managers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  previous_stage TEXT,
  new_stage TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  committee_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pool_governance_timeline_fund ON pool_governance_timeline(fund_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pool_governance_timeline_manager ON pool_governance_timeline(pool_manager_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- Seed platform-wide default rules
-- -----------------------------------------------------------------------------
INSERT INTO pool_governance_rules (fund_id, rule_key, rule_name, description, rule_type, threshold_value, threshold_unit, default_severity)
VALUES
  (NULL, 'max_daily_drawdown', 'Maximum Daily Drawdown', 'Daily drawdown must not exceed threshold.', 'max_daily_drawdown', 5, 'percent', 'major'),
  (NULL, 'max_overall_drawdown', 'Maximum Overall Drawdown', 'Overall drawdown must not exceed threshold.', 'max_overall_drawdown', 15, 'percent', 'critical'),
  (NULL, 'max_consecutive_losing_days', 'Maximum Consecutive Losing Days', 'Consecutive losing days limit.', 'max_consecutive_losing_days', 5, 'days', 'minor'),
  (NULL, 'max_consecutive_losing_trades', 'Maximum Consecutive Losing Trades', 'Consecutive losing trades limit.', 'max_consecutive_losing_trades', 7, 'trades', 'minor'),
  (NULL, 'min_monthly_return', 'Minimum Monthly Return', 'Minimum expected monthly return.', 'min_monthly_return', -3, 'percent', 'major'),
  (NULL, 'min_win_rate', 'Minimum Win Rate', 'Minimum win rate requirement.', 'min_win_rate', 45, 'percent', 'minor'),
  (NULL, 'max_exposure_per_trade', 'Maximum Exposure Per Trade', 'Single trade exposure cap.', 'max_exposure_per_trade', 2, 'percent', 'major'),
  (NULL, 'max_open_positions', 'Maximum Open Positions', 'Open positions limit.', 'max_open_positions', 10, 'count', 'minor'),
  (NULL, 'max_daily_trades', 'Maximum Daily Trades', 'Daily trade count limit.', 'max_daily_trades', 20, 'trades', 'minor'),
  (NULL, 'min_monthly_trading_activity', 'Minimum Monthly Trading Activity', 'Minimum trades per month.', 'min_monthly_trading_activity', 5, 'trades', 'information'),
  (NULL, 'max_weekly_volatility', 'Maximum Weekly Volatility', 'Weekly volatility cap.', 'max_weekly_volatility', 8, 'percent', 'major')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- Notification types for governance
-- -----------------------------------------------------------------------------
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'pool_governance_warning';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'pool_governance_violation';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'pool_governance_probation';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'pool_governance_restricted';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'pool_governance_suspended';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'pool_governance_reactivated';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'pool_governance_review';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'pool_investment_restricted';

-- -----------------------------------------------------------------------------
-- RLS — admin-only governance tables
-- -----------------------------------------------------------------------------
ALTER TABLE pool_governance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_governance_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_governance_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_governance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_governance_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_governance_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage governance rules" ON pool_governance_rules;
CREATE POLICY "Admins manage governance rules"
  ON pool_governance_rules FOR ALL
  USING (get_user_role() = 'administrator')
  WITH CHECK (get_user_role() = 'administrator');

DROP POLICY IF EXISTS "Admins manage governance violations" ON pool_governance_violations;
CREATE POLICY "Admins manage governance violations"
  ON pool_governance_violations FOR ALL
  USING (get_user_role() = 'administrator')
  WITH CHECK (get_user_role() = 'administrator');

DROP POLICY IF EXISTS "Admins manage governance warnings" ON pool_governance_warnings;
CREATE POLICY "Admins manage governance warnings"
  ON pool_governance_warnings FOR ALL
  USING (get_user_role() = 'administrator')
  WITH CHECK (get_user_role() = 'administrator');

DROP POLICY IF EXISTS "Admins manage governance reviews" ON pool_governance_reviews;
CREATE POLICY "Admins manage governance reviews"
  ON pool_governance_reviews FOR ALL
  USING (get_user_role() = 'administrator')
  WITH CHECK (get_user_role() = 'administrator');

DROP POLICY IF EXISTS "Admins manage governance scores" ON pool_governance_scores;
CREATE POLICY "Admins manage governance scores"
  ON pool_governance_scores FOR ALL
  USING (get_user_role() = 'administrator')
  WITH CHECK (get_user_role() = 'administrator');

DROP POLICY IF EXISTS "Admins manage governance timeline" ON pool_governance_timeline;
CREATE POLICY "Admins manage governance timeline"
  ON pool_governance_timeline FOR ALL
  USING (get_user_role() = 'administrator')
  WITH CHECK (get_user_role() = 'administrator');

-- Investors may read investor-visible reviews
DROP POLICY IF EXISTS "Investors view published governance reviews" ON pool_governance_reviews;
CREATE POLICY "Investors view published governance reviews"
  ON pool_governance_reviews FOR SELECT
  USING (visibility = 'investors' OR get_user_role() = 'administrator');

-- Pool managers view their own timeline (read-only)
DROP POLICY IF EXISTS "PMs view own governance timeline" ON pool_governance_timeline;
CREATE POLICY "PMs view own governance timeline"
  ON pool_governance_timeline FOR SELECT
  USING (
    get_user_role() = 'administrator'
    OR pool_manager_id IN (
      SELECT id FROM pool_managers WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE pool_governance_rules IS 'Admin-configured governance rules. fund_id NULL = platform default.';
COMMENT ON TABLE pool_governance_timeline IS 'Immutable governance event history. Entries cannot be deleted.';
