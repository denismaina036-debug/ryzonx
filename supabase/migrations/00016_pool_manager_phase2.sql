-- =============================================================================
-- Phase 2: Pool Manager role, application workflow, profiles, pool lifecycle
-- =============================================================================

-- Extend user roles
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'pool_manager_applicant';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'pool_manager';

-- Extend notification types for Pool Manager workflow
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'pm_application_submitted';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'pm_challenge_started';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'pm_challenge_passed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'pm_challenge_failed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'pm_strategy_changes';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'pm_interview_scheduled';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'pm_application_approved';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'pm_application_rejected';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'pm_pool_approved';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'pm_pool_suspended';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'pm_pool_closed';

-- Application status lifecycle
CREATE TYPE pool_manager_application_status AS ENUM (
  'draft',
  'pending',
  'under_review',
  'requires_changes',
  'interview_required',
  'approved',
  'rejected'
);

-- -----------------------------------------------------------------------------
-- Pool Manager Applications (5-stage workflow)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pool_manager_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status pool_manager_application_status NOT NULL DEFAULT 'draft',
  current_stage SMALLINT NOT NULL DEFAULT 1 CHECK (current_stage BETWEEN 1 AND 5),
  basic_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  strategy_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  strategy_submitted_at TIMESTAMPTZ,
  challenge_enrollment_id UUID REFERENCES trader_challenge_enrollments(id) ON DELETE SET NULL,
  pool_manager_id UUID REFERENCES pool_managers(id) ON DELETE SET NULL,
  admin_notes TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pool_manager_applications_user_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_pm_applications_user ON pool_manager_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_pm_applications_status ON pool_manager_applications(status);

CREATE TRIGGER pool_manager_applications_updated_at
  BEFORE UPDATE ON pool_manager_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Admin review history
CREATE TABLE IF NOT EXISTS pool_manager_application_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES pool_manager_applications(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id),
  previous_status pool_manager_application_status,
  new_status pool_manager_application_status NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_application_reviews_app
  ON pool_manager_application_reviews(application_id, created_at DESC);

-- Challenge results linked to applications
CREATE TABLE IF NOT EXISTS trader_challenge_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID NOT NULL REFERENCES trader_challenge_enrollments(id) ON DELETE CASCADE,
  application_id UUID REFERENCES pool_manager_applications(id) ON DELETE SET NULL,
  passed BOOLEAN NOT NULL DEFAULT false,
  profit_pct NUMERIC(8, 4),
  max_drawdown_pct NUMERIC(8, 4),
  trading_days INTEGER,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trader_challenge_results_enrollment
  ON trader_challenge_results(enrollment_id);

-- Extend trader challenge configuration
ALTER TABLE trader_challenges
  ADD COLUMN IF NOT EXISTS min_trading_days INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_risk_per_trade_pct NUMERIC(8, 4),
  ADD COLUMN IF NOT EXISTS trading_rules TEXT,
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'general'
    CHECK (purpose IN ('general', 'pool_manager'));

-- Extend pool_managers for public profiles
ALTER TABLE pool_managers
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS trading_since DATE,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS markets TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS trading_style TEXT,
  ADD COLUMN IF NOT EXISTS ryvonx_rating NUMERIC(3, 1),
  ADD COLUMN IF NOT EXISTS security_rating NUMERIC(3, 1),
  ADD COLUMN IF NOT EXISTS aggressiveness_rating NUMERIC(3, 1),
  ADD COLUMN IF NOT EXISTS win_rate_pct NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS avg_monthly_return_pct NUMERIC(8, 4),
  ADD COLUMN IF NOT EXISTS max_drawdown_pct NUMERIC(8, 4),
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES pool_manager_applications(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pool_managers_slug ON pool_managers(slug) WHERE slug IS NOT NULL;

-- Pool lifecycle (admin-controlled transitions to approved/live)
ALTER TABLE funds
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'live'
    CHECK (lifecycle_status IN (
      'draft', 'submitted', 'under_review', 'approved',
      'live', 'paused', 'restricted', 'closed', 'archived'
    )),
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

UPDATE funds
SET lifecycle_status = CASE
  WHEN status = 'paused' THEN 'paused'
  WHEN status = 'closed' THEN 'closed'
  WHEN status = 'archived' THEN 'archived'
  ELSE 'live'
END
WHERE lifecycle_status = 'live' OR lifecycle_status IS NULL;

-- Backfill platform manager slug
UPDATE pool_managers
SET slug = 'ryvonx-trading-desk'
WHERE id = '00000000-0000-4000-a000-000000000010' AND slug IS NULL;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
ALTER TABLE pool_manager_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_manager_application_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE trader_challenge_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own pool manager application" ON pool_manager_applications;
CREATE POLICY "Users view own pool manager application"
  ON pool_manager_applications FOR SELECT
  USING (auth.uid() = user_id OR get_user_role() = 'administrator');

DROP POLICY IF EXISTS "Users manage own pool manager application" ON pool_manager_applications;
CREATE POLICY "Users manage own pool manager application"
  ON pool_manager_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own pool manager application" ON pool_manager_applications;
CREATE POLICY "Users update own pool manager application"
  ON pool_manager_applications FOR UPDATE
  USING (auth.uid() = user_id OR get_user_role() = 'administrator');

DROP POLICY IF EXISTS "Admins manage pool manager applications" ON pool_manager_applications;
CREATE POLICY "Admins manage pool manager applications"
  ON pool_manager_applications FOR ALL
  USING (get_user_role() = 'administrator');

DROP POLICY IF EXISTS "Users view own application reviews" ON pool_manager_application_reviews;
CREATE POLICY "Users view own application reviews"
  ON pool_manager_application_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pool_manager_applications a
      WHERE a.id = application_id AND (a.user_id = auth.uid() OR get_user_role() = 'administrator')
    )
  );

DROP POLICY IF EXISTS "Admins insert application reviews" ON pool_manager_application_reviews;
CREATE POLICY "Admins insert application reviews"
  ON pool_manager_application_reviews FOR INSERT
  WITH CHECK (get_user_role() = 'administrator');

DROP POLICY IF EXISTS "Users view own challenge results" ON trader_challenge_results;
CREATE POLICY "Users view own challenge results"
  ON trader_challenge_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trader_challenge_enrollments e
      WHERE e.id = enrollment_id AND (e.user_id = auth.uid() OR get_user_role() = 'administrator')
    )
  );

DROP POLICY IF EXISTS "Admins manage challenge results" ON trader_challenge_results;
CREATE POLICY "Admins manage challenge results"
  ON trader_challenge_results FOR ALL
  USING (get_user_role() = 'administrator');

-- Pool managers can view their own record (even during onboarding)
DROP POLICY IF EXISTS "Pool managers view own profile" ON pool_managers;
CREATE POLICY "Pool managers view own profile"
  ON pool_managers FOR SELECT
  USING (status = 'approved' OR auth.uid() = user_id OR get_user_role() = 'administrator');

DROP POLICY IF EXISTS "Pool managers update own draft profile" ON pool_managers;
CREATE POLICY "Pool managers update own draft profile"
  ON pool_managers FOR UPDATE
  USING (auth.uid() = user_id OR get_user_role() = 'administrator');

COMMENT ON TABLE pool_manager_applications IS
  'Five-stage Pool Manager application workflow controlled by RyvonX administration.';
