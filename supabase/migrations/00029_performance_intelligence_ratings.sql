-- =============================================================================
-- Migration 029: Performance Intelligence & Dynamic Ratings
-- Architecture: 05_DYNAMIC_RATINGS_ENGINE.md
-- =============================================================================

CREATE TYPE rating_entity_type AS ENUM ('pool_manager', 'strategy', 'investment_cycle');

CREATE TABLE IF NOT EXISTS rating_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rating_profiles_name_nonempty CHECK (char_length(trim(name)) > 0)
);

CREATE TABLE IF NOT EXISTS rating_category_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES rating_profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  label TEXT NOT NULL,
  weight NUMERIC(6, 4) NOT NULL CHECK (weight >= 0 AND weight <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rating_category_weights_unique UNIQUE (profile_id, category),
  CONSTRAINT rating_category_weights_label_nonempty CHECK (char_length(trim(label)) > 0)
);

CREATE TABLE IF NOT EXISTS rating_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type rating_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  profile_id UUID NOT NULL REFERENCES rating_profiles(id) ON DELETE RESTRICT,
  overall_score NUMERIC(6, 2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  overall_rating NUMERIC(3, 2) CHECK (overall_rating IS NULL OR (overall_rating >= 0 AND overall_rating <= 5)),
  performance_grade TEXT,
  risk_grade TEXT,
  governance_grade TEXT,
  consistency_score NUMERIC(6, 2),
  operational_score NUMERIC(6, 2),
  confidence_score NUMERIC(6, 2),
  category_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  explanations JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  trend TEXT NOT NULL DEFAULT 'stable',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rating_snapshots_entity_profile_unique UNIQUE (entity_type, entity_id, profile_id)
);

CREATE TABLE IF NOT EXISTS rating_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type rating_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  profile_id UUID REFERENCES rating_profiles(id) ON DELETE SET NULL,
  previous_rating NUMERIC(3, 2),
  new_rating NUMERIC(3, 2) NOT NULL,
  previous_score NUMERIC(6, 2),
  new_score NUMERIC(6, 2) NOT NULL,
  reason TEXT NOT NULL,
  source_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rating_history_reason_nonempty CHECK (char_length(trim(reason)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_rating_snapshots_entity ON rating_snapshots(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_rating_history_entity ON rating_history(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rating_category_weights_profile ON rating_category_weights(profile_id);

CREATE TRIGGER rating_profiles_updated_at
  BEFORE UPDATE ON rating_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER rating_category_weights_updated_at
  BEFORE UPDATE ON rating_category_weights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Default platform rating profile
INSERT INTO rating_profiles (slug, name, description, is_active, rules)
VALUES (
  'platform-default',
  'Platform Default',
  'Default RyvonX dynamic ratings profile for pool managers, strategies, and cycles.',
  true,
  '{
    "gradeBands": [
      { "min": 90, "grade": "A" },
      { "min": 80, "grade": "B" },
      { "min": 70, "grade": "C" },
      { "min": 60, "grade": "D" },
      { "min": 0, "grade": "F" }
    ],
    "starScale": { "minScore": 0, "maxScore": 100, "minStars": 1, "maxStars": 5 },
    "categoryRules": {
      "trading_performance": { "minClosedTrades": 3, "winRateWeight": 0.7, "activityWeight": 0.3 },
      "risk_management": { "exposureRatioPenalty": 0.5, "openPositionPenalty": 5 },
      "consistency": { "completionWeight": 0.5, "snapshotWeight": 0.3, "cycleStabilityWeight": 0.2 },
      "capital_preservation": { "winLossRatioWeight": 0.6, "drawdownWeight": 0.4 },
      "governance": { "violationPenalty": 15, "flagPenalty": 10, "reviewBonus": 5 },
      "operational_discipline": { "journalWeight": 0.4, "snapshotWeight": 0.3, "timelineWeight": 0.3 },
      "investor_confidence": { "fundingWeight": 0.5, "participationWeight": 0.5 }
    }
  }'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO rating_category_weights (profile_id, category, label, weight)
SELECT p.id, w.category, w.label, w.weight
FROM rating_profiles p
CROSS JOIN (
  VALUES
    ('trading_performance', 'Trading Performance', 0.2000),
    ('risk_management', 'Risk Management', 0.1500),
    ('consistency', 'Consistency', 0.1500),
    ('capital_preservation', 'Capital Preservation', 0.1000),
    ('governance', 'Governance', 0.1500),
    ('operational_discipline', 'Operational Discipline', 0.1500),
    ('investor_confidence', 'Investor Confidence', 0.1000)
) AS w(category, label, weight)
WHERE p.slug = 'platform-default'
ON CONFLICT (profile_id, category) DO NOTHING;

-- RLS
ALTER TABLE rating_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rating_category_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE rating_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE rating_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY rating_profiles_admin_all ON rating_profiles
  FOR ALL USING (get_user_role() = 'administrator') WITH CHECK (get_user_role() = 'administrator');

CREATE POLICY rating_profiles_public_read ON rating_profiles
  FOR SELECT USING (is_active = true);

CREATE POLICY rating_category_weights_admin_all ON rating_category_weights
  FOR ALL USING (get_user_role() = 'administrator') WITH CHECK (get_user_role() = 'administrator');

CREATE POLICY rating_category_weights_public_read ON rating_category_weights
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM rating_profiles rp WHERE rp.id = profile_id AND rp.is_active = true)
  );

CREATE POLICY rating_snapshots_admin_all ON rating_snapshots
  FOR ALL USING (get_user_role() = 'administrator') WITH CHECK (get_user_role() = 'administrator');

CREATE POLICY rating_snapshots_manager_read ON rating_snapshots
  FOR SELECT USING (
    entity_type = 'pool_manager' AND entity_id = get_approved_pool_manager_id()
  );

CREATE POLICY rating_snapshots_public_read ON rating_snapshots
  FOR SELECT USING (
    entity_type = 'pool_manager' AND EXISTS (
      SELECT 1 FROM pool_managers pm
      WHERE pm.id = rating_snapshots.entity_id AND pm.status = 'approved'
    )
  );

CREATE POLICY rating_history_admin_all ON rating_history
  FOR ALL USING (get_user_role() = 'administrator') WITH CHECK (get_user_role() = 'administrator');

CREATE POLICY rating_history_manager_read ON rating_history
  FOR SELECT USING (
    entity_type = 'pool_manager' AND entity_id = get_approved_pool_manager_id()
  );

CREATE POLICY rating_history_public_read ON rating_history
  FOR SELECT USING (
    entity_type = 'pool_manager' AND EXISTS (
      SELECT 1 FROM pool_managers pm
      WHERE pm.id = rating_history.entity_id AND pm.status = 'approved'
    )
  );
