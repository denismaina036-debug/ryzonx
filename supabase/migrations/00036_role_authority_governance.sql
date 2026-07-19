-- =============================================================================
-- Migration 036: Role Authority & Permission Governance
-- Follows, investor reviews, entity revisions, platform settings seeds
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Entity revision workflow (pools + strategies post-approval edits)
-- ---------------------------------------------------------------------------
ALTER TABLE funds
  ADD COLUMN IF NOT EXISTS pending_revision JSONB,
  ADD COLUMN IF NOT EXISTS revision_status TEXT NOT NULL DEFAULT 'none'
    CHECK (revision_status IN ('none', 'pending_review', 'requires_changes'));

ALTER TABLE strategies
  ADD COLUMN IF NOT EXISTS pending_revision JSONB,
  ADD COLUMN IF NOT EXISTS revision_status TEXT NOT NULL DEFAULT 'none'
    CHECK (revision_status IN ('none', 'pending_review', 'requires_changes'));

COMMENT ON COLUMN funds.pending_revision IS
  'Draft config awaiting admin approval; approved version stays active until approved.';
COMMENT ON COLUMN strategies.pending_revision IS
  'Draft strategy fields awaiting admin approval; approved version stays active.';

-- ---------------------------------------------------------------------------
-- Investor → Pool Manager follows
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS investor_manager_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pool_manager_id UUID NOT NULL REFERENCES pool_managers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (investor_id, pool_manager_id)
);

CREATE INDEX IF NOT EXISTS idx_investor_follows_investor
  ON investor_manager_follows(investor_id);
CREATE INDEX IF NOT EXISTS idx_investor_follows_manager
  ON investor_manager_follows(pool_manager_id);

ALTER TABLE investor_manager_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY investor_follows_own ON investor_manager_follows
  FOR ALL USING (investor_id = auth.uid()) WITH CHECK (investor_id = auth.uid());

CREATE POLICY investor_follows_admin ON investor_manager_follows
  FOR ALL USING (get_user_role() = 'administrator') WITH CHECK (get_user_role() = 'administrator');

CREATE POLICY investor_follows_public_read ON investor_manager_follows
  FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- Investor reviews (after completed cycle participation)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pool_manager_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  pool_manager_id UUID NOT NULL REFERENCES pool_managers(id) ON DELETE RESTRICT,
  investment_cycle_id UUID NOT NULL REFERENCES investment_cycles(id) ON DELETE RESTRICT,
  investment_allocation_id UUID NOT NULL REFERENCES investment_allocations(id) ON DELETE RESTRICT,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  message TEXT NOT NULL CHECK (char_length(trim(message)) >= 3),
  status TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('published', 'removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (investment_allocation_id)
);

CREATE INDEX IF NOT EXISTS idx_pm_reviews_manager
  ON pool_manager_reviews(pool_manager_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pm_reviews_investor
  ON pool_manager_reviews(investor_id);

CREATE TRIGGER pool_manager_reviews_updated_at
  BEFORE UPDATE ON pool_manager_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE pool_manager_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY pm_reviews_public_read ON pool_manager_reviews
  FOR SELECT USING (status = 'published');

CREATE POLICY pm_reviews_investor_insert ON pool_manager_reviews
  FOR INSERT WITH CHECK (investor_id = auth.uid());

CREATE POLICY pm_reviews_investor_read_own ON pool_manager_reviews
  FOR SELECT USING (investor_id = auth.uid());

CREATE POLICY pm_reviews_admin_all ON pool_manager_reviews
  FOR ALL USING (get_user_role() = 'administrator') WITH CHECK (get_user_role() = 'administrator');

-- ---------------------------------------------------------------------------
-- Admin profile management (role / account status — never passwords)
-- ---------------------------------------------------------------------------
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (get_user_role() = 'administrator')
  WITH CHECK (get_user_role() = 'administrator');

-- ---------------------------------------------------------------------------
-- Platform settings seeds
-- ---------------------------------------------------------------------------
INSERT INTO platform_settings (key, value, description)
VALUES
  ('platform_service_fee_pct', '2.5'::jsonb, 'RyvonX platform service fee on positive trading profits (percent)'),
  ('platform_name', '"RyvonX"'::jsonb, 'Platform display name'),
  ('maintenance_mode', 'false'::jsonb, 'When true, public routes show maintenance message'),
  ('registration_enabled', 'true'::jsonb, 'Allow new user registration'),
  ('pool_manager_applications_enabled', 'true'::jsonb, 'Allow pool manager applications'),
  ('default_currency', '"USD"'::jsonb, 'Default platform currency'),
  ('min_investment', '100'::jsonb, 'Platform-wide minimum investment'),
  ('min_withdrawal', '50'::jsonb, 'Minimum withdrawal amount'),
  ('max_withdrawal', 'null'::jsonb, 'Maximum withdrawal amount (null = no cap)'),
  ('support_email', '"hello@ryvonx.com"'::jsonb, 'Support contact email'),
  ('business_email', '"business@ryvonx.com"'::jsonb, 'Business contact email'),
  ('branding', '{"primaryColor":"#0f1623","secondaryColor":"#486581","logoUrl":null,"faviconUrl":null}'::jsonb, 'Platform branding'),
  ('landing_content', '{"heroHeading":"Invest in professionally managed trading pools","heroDescription":"Transparent pool trading with full visibility into performance."}'::jsonb, 'Public landing page content'),
  ('feature_flags', '{"publicLeaderboards":false,"referralProgram":false}'::jsonb, 'Feature toggles without code deploy')
ON CONFLICT (key) DO NOTHING;
