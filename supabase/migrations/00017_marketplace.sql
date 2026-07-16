-- =============================================================================
-- Phase 3: Investment Pool Marketplace
-- Listing visibility, ratings, categories, capacity — admin-controlled
-- =============================================================================

ALTER TABLE funds
  ADD COLUMN IF NOT EXISTS is_marketplace_listed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS listed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS categories TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS security_rating TEXT
    CHECK (security_rating IS NULL OR security_rating IN (
      'very_safe', 'safe', 'balanced', 'aggressive', 'high_risk'
    )),
  ADD COLUMN IF NOT EXISTS aggressiveness_level TEXT
    CHECK (aggressiveness_level IS NULL OR aggressiveness_level IN (
      'low', 'moderate', 'high', 'extreme'
    )),
  ADD COLUMN IF NOT EXISTS pool_health TEXT NOT NULL DEFAULT 'healthy'
    CHECK (pool_health IN (
      'healthy', 'watchlist', 'warning', 'restricted', 'suspended'
    )),
  ADD COLUMN IF NOT EXISTS capacity_status TEXT NOT NULL DEFAULT 'open'
    CHECK (capacity_status IN (
      'open', 'nearly_full', 'full', 'closed', 'waiting_list'
    )),
  ADD COLUMN IF NOT EXISTS max_aum NUMERIC(18, 2),
  ADD COLUMN IF NOT EXISTS max_investors_cap INTEGER,
  ADD COLUMN IF NOT EXISTS ryvonx_rating NUMERIC(3, 1),
  ADD COLUMN IF NOT EXISTS suggested_investment NUMERIC(18, 2),
  ADD COLUMN IF NOT EXISTS risk_summary TEXT,
  ADD COLUMN IF NOT EXISTS pool_faq JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS admin_comments TEXT,
  ADD COLUMN IF NOT EXISTS admin_ranking INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS markets_traded TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_funds_marketplace_listed
  ON funds (is_marketplace_listed, lifecycle_status, status)
  WHERE is_marketplace_listed = true;

CREATE INDEX IF NOT EXISTS idx_funds_categories ON funds USING GIN (categories);
CREATE INDEX IF NOT EXISTS idx_funds_markets ON funds USING GIN (markets_traded);

-- Backfill default RyvonX pool as marketplace-listed
UPDATE funds
SET
  is_marketplace_listed = true,
  listed_at = COALESCE(listed_at, approved_at, created_at, now()),
  lifecycle_status = CASE
    WHEN lifecycle_status IN ('draft', 'submitted', 'under_review') THEN 'live'
    ELSE lifecycle_status
  END,
  security_rating = COALESCE(security_rating, 'balanced'),
  aggressiveness_level = COALESCE(aggressiveness_level, 'moderate'),
  pool_health = 'healthy',
  capacity_status = 'open',
  tagline = COALESCE(tagline, 'Official RyvonX platform-managed trading pool'),
  categories = CASE
    WHEN categories = '{}' THEN ARRAY['balanced', 'multi_asset']::TEXT[]
    ELSE categories
  END,
  markets_traded = CASE
    WHEN markets_traded = '{}' THEN ARRAY['Forex', 'Indices', 'Crypto']::TEXT[]
    ELSE markets_traded
  END,
  ryvonx_rating = COALESCE(ryvonx_rating, 4.5),
  suggested_investment = COALESCE(suggested_investment, min_investment),
  max_aum = COALESCE(max_aum, target_capital),
  max_investors_cap = COALESCE(max_investors_cap, target_investors)
WHERE id = '00000000-0000-4000-a000-000000000001';

-- Live PM pools with active status can be listed by admin
COMMENT ON COLUMN funds.is_marketplace_listed IS
  'When true and lifecycle_status=live, pool appears on the public marketplace.';
COMMENT ON COLUMN funds.security_rating IS 'Admin-controlled. Pool Managers cannot edit.';
COMMENT ON COLUMN funds.aggressiveness_level IS 'Admin-controlled. Pool Managers cannot edit.';
COMMENT ON COLUMN funds.pool_health IS 'Admin-controlled health indicator for investors.';

-- Allow public read of marketplace-listed live pools
DROP POLICY IF EXISTS "Anyone can view marketplace listed pools" ON funds;
CREATE POLICY "Anyone can view marketplace listed pools"
  ON funds FOR SELECT
  USING (
    is_marketplace_listed = true
    AND lifecycle_status IN ('live', 'approved')
    AND status = 'active'
  );
