-- =============================================================================
-- Migration 024: Core Investment Domain — Strategies
-- Permanent investment methodologies owned by Pool Managers.
-- Introduced alongside existing `funds` model; no changes to legacy tables.
-- Architecture: 01_RYVONX_INVESTMENT_ARCHITECTURE.md §13, 09_DATABASE_RELATIONSHIPS.md §7
-- =============================================================================

CREATE TYPE strategy_status AS ENUM (
  'draft',
  'submitted',
  'under_review',
  'approved',
  'available',
  'operating',
  'paused',
  'archived'
);

CREATE TYPE strategy_visibility AS ENUM (
  'private',
  'internal',
  'public'
);

CREATE TYPE strategy_risk_profile AS ENUM (
  'conservative',
  'balanced',
  'moderate',
  'aggressive',
  'speculative'
);

CREATE TABLE IF NOT EXISTS strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_manager_id UUID NOT NULL REFERENCES pool_managers(id) ON DELETE RESTRICT,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  objectives TEXT,
  risk_profile strategy_risk_profile,
  investment_style TEXT,
  supported_assets TEXT[] NOT NULL DEFAULT '{}',
  status strategy_status NOT NULL DEFAULT 'draft',
  visibility strategy_visibility NOT NULL DEFAULT 'private',
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT strategies_pool_manager_slug_unique UNIQUE (pool_manager_id, slug),
  CONSTRAINT strategies_name_nonempty CHECK (char_length(trim(name)) > 0)
);

COMMENT ON TABLE strategies IS
  'Permanent Pool Manager investment methodologies. Strategies are not deleted; archive preserves history.';

CREATE INDEX IF NOT EXISTS idx_strategies_pool_manager ON strategies(pool_manager_id);
CREATE INDEX IF NOT EXISTS idx_strategies_status ON strategies(status);
CREATE INDEX IF NOT EXISTS idx_strategies_visibility ON strategies(visibility);

CREATE TRIGGER strategies_updated_at
  BEFORE UPDATE ON strategies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
