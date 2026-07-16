-- =============================================================================
-- Phase 5: Capital Allocation Program & Pool Growth Ecosystem
-- RyvonX company capital, manager career progression, achievements, content
-- =============================================================================

-- Manager career levels (admin-controlled promotions)
ALTER TABLE pool_managers
  ADD COLUMN IF NOT EXISTS manager_level TEXT NOT NULL DEFAULT 'verified_pool_manager'
    CHECK (manager_level IN (
      'verified_pool_manager', 'professional_pool_manager', 'elite_pool_manager',
      'capital_allocation_candidate', 'ryvonx_backed_fund_manager'
    )),
  ADD COLUMN IF NOT EXISTS level_promoted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS level_promoted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS next_level_review_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS development_notes TEXT;

-- Pool capital split: investor vs RyvonX company capital
ALTER TABLE funds
  ADD COLUMN IF NOT EXISTS investor_capital NUMERIC(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ryvonx_capital NUMERIC(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_ryvonx_backed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ryvonx_backed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ryvonx_backed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS allocation_status TEXT NOT NULL DEFAULT 'none'
    CHECK (allocation_status IN (
      'none', 'candidate', 'under_review', 'approved', 'active',
      'paused', 'reduced', 'removed'
    )),
  ADD COLUMN IF NOT EXISTS allocation_review_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS growth_rate_pct NUMERIC(8, 4);

-- Backfill investor capital from existing current_capital
UPDATE funds
SET investor_capital = COALESCE(current_capital, 0)
WHERE investor_capital = 0;

-- Platform capital pool (singleton settings row)
CREATE TABLE IF NOT EXISTS ryvonx_capital_settings (
  id UUID PRIMARY KEY DEFAULT '00000000-0000-4000-a000-000000000002'::uuid,
  total_available_capital NUMERIC(18, 2) NOT NULL DEFAULT 5000000,
  total_allocated_capital NUMERIC(18, 2) NOT NULL DEFAULT 0,
  min_allocation NUMERIC(18, 2) DEFAULT 10000,
  max_allocation NUMERIC(18, 2) DEFAULT 500000,
  default_review_frequency TEXT DEFAULT 'quarterly'
    CHECK (default_review_frequency IN ('monthly', 'quarterly', 'annual')),
  performance_expectations TEXT,
  risk_limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO ryvonx_capital_settings (id)
VALUES ('00000000-0000-4000-a000-000000000002'::uuid)
ON CONFLICT (id) DO NOTHING;

-- Allocation workflow records (permanent history)
CREATE TABLE IF NOT EXISTS pool_capital_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  pool_manager_id UUID REFERENCES pool_managers(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN (
    'candidate', 'review', 'approve', 'allocate', 'increase',
    'maintain', 'reduce', 'pause', 'remove'
  )),
  amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  previous_amount NUMERIC(18, 2),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'active', 'paused', 'reduced', 'removed')),
  committee_label TEXT,
  review_notes TEXT,
  performance_expectations TEXT,
  risk_limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  allocation_period_start DATE,
  allocation_period_end DATE,
  next_review_at TIMESTAMPTZ,
  decided_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pool_capital_allocations_fund
  ON pool_capital_allocations(fund_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pool_capital_allocations_status
  ON pool_capital_allocations(status, created_at DESC);

-- Achievement definitions (catalog)
CREATE TABLE IF NOT EXISTS pool_manager_achievement_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'growth',
  icon_key TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Awarded achievements
CREATE TABLE IF NOT EXISTS pool_manager_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_manager_id UUID NOT NULL REFERENCES pool_managers(id) ON DELETE CASCADE,
  fund_id UUID REFERENCES funds(id) ON DELETE SET NULL,
  achievement_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  awarded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  committee_label TEXT,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (pool_manager_id, achievement_key)
);

CREATE INDEX IF NOT EXISTS idx_pm_achievements_manager
  ON pool_manager_achievements(pool_manager_id, awarded_at DESC);

-- Career / promotion events (immutable)
CREATE TABLE IF NOT EXISTS pool_manager_career_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_manager_id UUID NOT NULL REFERENCES pool_managers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'promotion', 'evaluation', 'committee_review', 'development_note'
  )),
  previous_level TEXT,
  new_level TEXT,
  title TEXT NOT NULL,
  description TEXT,
  committee_label TEXT,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_career_events_manager
  ON pool_manager_career_events(pool_manager_id, created_at DESC);

-- Community content (admin-approved publishing)
CREATE TABLE IF NOT EXISTS pool_manager_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_manager_id UUID NOT NULL REFERENCES pool_managers(id) ON DELETE CASCADE,
  fund_id UUID REFERENCES funds(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL CHECK (content_type IN (
    'pool_update', 'commentary', 'article', 'outlook',
    'performance_report', 'announcement'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'approved', 'published', 'rejected')),
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  review_notes TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_content_status ON pool_manager_content(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pm_content_published ON pool_manager_content(published_at DESC)
  WHERE status = 'published';

-- Seed achievement definitions
INSERT INTO pool_manager_achievement_definitions (achievement_key, title, description, category, sort_order)
VALUES
  ('100_investors', '100 Investors', 'Reached 100 active investors.', 'growth', 10),
  ('500_investors', '500 Investors', 'Reached 500 active investors.', 'growth', 20),
  ('1m_aum', '$1M Assets Managed', 'Pool exceeded $1M in assets under management.', 'growth', 30),
  ('10m_aum', '$10M Assets Managed', 'Pool exceeded $10M in assets under management.', 'growth', 40),
  ('12_profitable_months', '12 Consecutive Profitable Months', 'Sustained profitability for 12 months.', 'performance', 50),
  ('capital_preservation', 'Capital Preservation Award', 'Exceptional capital preservation record.', 'risk', 60),
  ('elite_risk_management', 'Elite Risk Management', 'Outstanding risk discipline.', 'risk', 70),
  ('low_drawdown', 'Low Drawdown Award', 'Maintained minimal drawdown.', 'risk', 80),
  ('most_consistent', 'Most Consistent Manager', 'Highest consistency rating.', 'performance', 90),
  ('top_growth', 'Top Growth Manager', 'Leading pool growth rate.', 'growth', 100),
  ('investor_favourite', 'Investor Favourite', 'Highest investor satisfaction.', 'community', 110)
ON CONFLICT (achievement_key) DO NOTHING;

-- Notification types
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'capital_review_scheduled';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'capital_allocation_approved';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'capital_allocation_increased';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'capital_allocation_reduced';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'capital_allocation_removed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'manager_promotion_achieved';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'manager_achievement_awarded';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'committee_review_completed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'content_approved';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'content_rejected';

-- RLS
ALTER TABLE ryvonx_capital_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_capital_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_manager_achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_manager_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_manager_career_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_manager_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage capital settings" ON ryvonx_capital_settings;
CREATE POLICY "Admins manage capital settings"
  ON ryvonx_capital_settings FOR ALL
  USING (get_user_role() = 'administrator')
  WITH CHECK (get_user_role() = 'administrator');

DROP POLICY IF EXISTS "Admins manage capital allocations" ON pool_capital_allocations;
CREATE POLICY "Admins manage capital allocations"
  ON pool_capital_allocations FOR ALL
  USING (get_user_role() = 'administrator')
  WITH CHECK (get_user_role() = 'administrator');

DROP POLICY IF EXISTS "Public view achievement definitions" ON pool_manager_achievement_definitions;
CREATE POLICY "Public view achievement definitions"
  ON pool_manager_achievement_definitions FOR SELECT
  USING (is_active = true OR get_user_role() = 'administrator');

DROP POLICY IF EXISTS "Admins manage achievement definitions" ON pool_manager_achievement_definitions;
CREATE POLICY "Admins manage achievement definitions"
  ON pool_manager_achievement_definitions FOR ALL
  USING (get_user_role() = 'administrator')
  WITH CHECK (get_user_role() = 'administrator');

DROP POLICY IF EXISTS "Public view achievements" ON pool_manager_achievements;
CREATE POLICY "Public view achievements"
  ON pool_manager_achievements FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage achievements" ON pool_manager_achievements;
CREATE POLICY "Admins manage achievements"
  ON pool_manager_achievements FOR INSERT
  WITH CHECK (get_user_role() = 'administrator');

DROP POLICY IF EXISTS "PMs view own career events" ON pool_manager_career_events;
CREATE POLICY "PMs view own career events"
  ON pool_manager_career_events FOR SELECT
  USING (
    get_user_role() = 'administrator'
    OR pool_manager_id IN (SELECT id FROM pool_managers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins manage career events" ON pool_manager_career_events;
CREATE POLICY "Admins manage career events"
  ON pool_manager_career_events FOR ALL
  USING (get_user_role() = 'administrator')
  WITH CHECK (get_user_role() = 'administrator');

DROP POLICY IF EXISTS "PMs manage own content" ON pool_manager_content;
CREATE POLICY "PMs manage own content"
  ON pool_manager_content FOR ALL
  USING (
    get_user_role() = 'administrator'
    OR pool_manager_id IN (SELECT id FROM pool_managers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    get_user_role() = 'administrator'
    OR pool_manager_id IN (SELECT id FROM pool_managers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Public view published content" ON pool_manager_content;
CREATE POLICY "Public view published content"
  ON pool_manager_content FOR SELECT
  USING (status = 'published' OR get_user_role() = 'administrator'
    OR pool_manager_id IN (SELECT id FROM pool_managers WHERE user_id = auth.uid()));

COMMENT ON COLUMN funds.investor_capital IS 'Capital from investors only.';
COMMENT ON COLUMN funds.ryvonx_capital IS 'RyvonX company capital allocated by administration.';
COMMENT ON COLUMN funds.is_ryvonx_backed IS 'Admin-assigned RyvonX Backed badge.';
