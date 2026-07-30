-- =============================================================================
-- Migration 053: ROI Engine v2 — Standardized platform investment levels,
-- pool ROI multipliers, and proportional profit distribution tracking.
-- =============================================================================

-- Platform-wide investment levels (Super Admin controlled)
CREATE TABLE IF NOT EXISTS platform_investment_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  min_amount NUMERIC(18, 2) NOT NULL CHECK (min_amount >= 0),
  max_amount NUMERIC(18, 2) CHECK (max_amount IS NULL OR max_amount >= min_amount),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE platform_investment_levels IS
  'Global investment tiers inherited by every pool. Managed by Super Admin only.';
COMMENT ON COLUMN platform_investment_levels.max_amount IS
  'NULL means no upper bound (e.g. Professional: above min_amount).';

CREATE INDEX IF NOT EXISTS idx_platform_investment_levels_active
  ON platform_investment_levels (is_active, sort_order);

-- Per-pool ROI multiplier per platform investment level
CREATE TABLE IF NOT EXISTS pool_roi_multipliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  investment_level_id UUID NOT NULL REFERENCES platform_investment_levels(id) ON DELETE RESTRICT,
  multiplier NUMERIC(8, 4) NOT NULL CHECK (multiplier > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pool_roi_multipliers_fund_level_unique UNIQUE (fund_id, investment_level_id)
);

CREATE INDEX IF NOT EXISTS idx_pool_roi_multipliers_fund
  ON pool_roi_multipliers (fund_id);

COMMENT ON TABLE pool_roi_multipliers IS
  'Pool Manager projected ROI multiplier target per platform investment level.';

-- Normalized return duration on funds
ALTER TABLE funds
  ADD COLUMN IF NOT EXISTS return_duration_preset TEXT,
  ADD COLUMN IF NOT EXISTS return_duration_value INTEGER CHECK (return_duration_value IS NULL OR return_duration_value > 0),
  ADD COLUMN IF NOT EXISTS return_duration_unit TEXT CHECK (
    return_duration_unit IS NULL OR return_duration_unit IN ('hours', 'days', 'weeks', 'months')
  );

COMMENT ON COLUMN funds.return_duration_preset IS
  'hourly | daily | weekly | monthly | custom';
COMMENT ON COLUMN funds.return_duration_value IS
  'Numeric duration when preset is custom (e.g. 24, 48, 7, 14, 30).';
COMMENT ON COLUMN funds.return_duration_unit IS
  'Unit for custom duration: hours, days, weeks, months.';

-- ROI tracking on investor allocations
ALTER TABLE investment_allocations
  ADD COLUMN IF NOT EXISTS investment_level_id UUID REFERENCES platform_investment_levels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS roi_multiplier NUMERIC(8, 4) CHECK (roi_multiplier IS NULL OR roi_multiplier > 0),
  ADD COLUMN IF NOT EXISTS projected_payout NUMERIC(18, 2) CHECK (projected_payout IS NULL OR projected_payout >= 0),
  ADD COLUMN IF NOT EXISTS cumulative_realised_return NUMERIC(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_fulfilled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN investment_allocations.cumulative_realised_return IS
  'Total profit distributions received by this investor for this allocation.';
COMMENT ON COLUMN investment_allocations.target_fulfilled IS
  'True when cumulative return reaches projected payout (amount × multiplier).';

-- Seed default platform investment levels
INSERT INTO platform_investment_levels (name, min_amount, max_amount, sort_order)
VALUES
  ('Starter', 100, 1000, 1),
  ('Growth', 1001, 5000, 2),
  ('Professional', 5001, NULL, 3)
ON CONFLICT DO NOTHING;

-- Migrate existing pool duration from pool_duration_days
UPDATE funds
SET
  return_duration_preset = CASE
    WHEN pool_duration_days = 1 THEN 'daily'
    WHEN pool_duration_days = 7 THEN 'weekly'
    WHEN pool_duration_days = 30 THEN 'monthly'
    WHEN pool_duration_days IS NOT NULL AND pool_duration_days > 0 THEN 'custom'
    ELSE 'daily'
  END,
  return_duration_value = CASE
    WHEN pool_duration_days IS NOT NULL AND pool_duration_days > 0 THEN pool_duration_days
    ELSE 1
  END,
  return_duration_unit = 'days'
WHERE return_duration_preset IS NULL;

-- Migrate return_tiers JSONB to pool_roi_multipliers where possible
DO $$
DECLARE
  fund_rec RECORD;
  tier_rec JSONB;
  level_rec RECORD;
  tier_min NUMERIC;
  tier_max NUMERIC;
  tier_pct NUMERIC;
  computed_multiplier NUMERIC;
BEGIN
  FOR fund_rec IN
    SELECT id, return_tiers FROM funds WHERE return_tiers IS NOT NULL AND jsonb_array_length(return_tiers) > 0
  LOOP
    FOR tier_rec IN SELECT * FROM jsonb_array_elements(fund_rec.return_tiers)
    LOOP
      tier_min := (tier_rec->>'minAmount')::NUMERIC;
      tier_max := CASE WHEN tier_rec->>'maxAmount' IS NULL THEN NULL ELSE (tier_rec->>'maxAmount')::NUMERIC END;
      tier_pct := COALESCE((tier_rec->>'returnPct')::NUMERIC, 0);
      computed_multiplier := ROUND(1 + tier_pct / 100, 4);

      SELECT * INTO level_rec FROM platform_investment_levels
      WHERE is_active = true
        AND min_amount = tier_min
        AND (
          (max_amount IS NULL AND tier_max IS NULL)
          OR max_amount = tier_max
        )
      ORDER BY sort_order
      LIMIT 1;

      IF level_rec.id IS NULL THEN
        SELECT * INTO level_rec FROM platform_investment_levels
        WHERE is_active = true
          AND tier_min >= min_amount
          AND (max_amount IS NULL OR tier_min <= max_amount)
        ORDER BY sort_order
        LIMIT 1;
      END IF;

      IF level_rec.id IS NOT NULL THEN
        INSERT INTO pool_roi_multipliers (fund_id, investment_level_id, multiplier)
        VALUES (fund_rec.id, level_rec.id, GREATEST(computed_multiplier, 1.0))
        ON CONFLICT (fund_id, investment_level_id) DO UPDATE
          SET multiplier = EXCLUDED.multiplier, updated_at = now();
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Default multipliers for pools without migrated data
INSERT INTO pool_roi_multipliers (fund_id, investment_level_id, multiplier)
SELECT f.id, pil.id, CASE pil.sort_order
  WHEN 1 THEN 2.00
  WHEN 2 THEN 2.30
  ELSE 2.50
END
FROM funds f
CROSS JOIN platform_investment_levels pil
WHERE pil.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM pool_roi_multipliers prm WHERE prm.fund_id = f.id
  )
ON CONFLICT (fund_id, investment_level_id) DO NOTHING;

-- Relax legacy profit-sharing constraint (no longer used by ROI v2 engine)
ALTER TABLE funds DROP CONSTRAINT IF EXISTS funds_profit_sharing_sum_100;

-- Triggers
CREATE TRIGGER platform_investment_levels_updated_at
  BEFORE UPDATE ON platform_investment_levels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER pool_roi_multipliers_updated_at
  BEFORE UPDATE ON pool_roi_multipliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE platform_investment_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_roi_multipliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_investment_levels_public_read ON platform_investment_levels
  FOR SELECT USING (is_active = true);

CREATE POLICY platform_investment_levels_admin_all ON platform_investment_levels
  FOR ALL USING (get_user_role() = 'administrator')
  WITH CHECK (get_user_role() = 'administrator');

CREATE POLICY pool_roi_multipliers_public_read ON pool_roi_multipliers
  FOR SELECT USING (true);

CREATE POLICY pool_roi_multipliers_manager_write ON pool_roi_multipliers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM funds f
      WHERE f.id = pool_roi_multipliers.fund_id
        AND f.pool_manager_id = get_approved_pool_manager_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM funds f
      WHERE f.id = pool_roi_multipliers.fund_id
        AND f.pool_manager_id = get_approved_pool_manager_id()
    )
  );

CREATE POLICY pool_roi_multipliers_admin_all ON pool_roi_multipliers
  FOR ALL USING (get_user_role() = 'administrator')
  WITH CHECK (get_user_role() = 'administrator');
