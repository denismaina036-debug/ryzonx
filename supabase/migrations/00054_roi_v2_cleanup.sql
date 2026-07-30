-- =============================================================================
-- Migration 054: ROI v2 cleanup — dedupe levels, backfill data, drop legacy columns
-- =============================================================================

-- Ensure default platform investment levels exist (idempotent by name)
INSERT INTO platform_investment_levels (name, min_amount, max_amount, sort_order)
SELECT v.name, v.min_amount, v.max_amount, v.sort_order
FROM (VALUES
  ('Starter', 100::numeric, 1000::numeric, 1),
  ('Growth', 1001::numeric, 5000::numeric, 2),
  ('Professional', 5001::numeric, NULL::numeric, 3)
) AS v(name, min_amount, max_amount, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM platform_investment_levels pil
  WHERE lower(trim(pil.name)) = lower(trim(v.name))
);

-- Remove duplicate investment levels (keep lowest sort_order, then earliest created)
WITH ranked AS (
  SELECT
    id,
    lower(trim(name)) AS normalized_name,
    ROW_NUMBER() OVER (
      PARTITION BY lower(trim(name))
      ORDER BY sort_order ASC, created_at ASC
    ) AS rn
  FROM platform_investment_levels
),
duplicates AS (
  SELECT id FROM ranked WHERE rn > 1
)
UPDATE pool_roi_multipliers prm
SET investment_level_id = keeper.id
FROM duplicates dup
JOIN platform_investment_levels dup_level ON dup_level.id = dup.id
JOIN platform_investment_levels keeper ON lower(trim(keeper.name)) = lower(trim(dup_level.name))
  AND keeper.id NOT IN (SELECT id FROM duplicates)
WHERE prm.investment_level_id = dup.id
  AND keeper.id != dup.id;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY lower(trim(name))
      ORDER BY sort_order ASC, created_at ASC
    ) AS rn
  FROM platform_investment_levels
)
DELETE FROM platform_investment_levels
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_investment_levels_name_unique
  ON platform_investment_levels (lower(trim(name)));

-- Reset legacy-converted multipliers (1.0–1.99× from old returnPct) to v2 defaults
UPDATE pool_roi_multipliers prm
SET multiplier = CASE pil.sort_order
  WHEN 1 THEN 2.00
  WHEN 2 THEN 2.30
  ELSE 2.50
END,
updated_at = now()
FROM platform_investment_levels pil
WHERE prm.investment_level_id = pil.id
  AND prm.multiplier > 0
  AND prm.multiplier < 1.5;

-- Ensure every fund has complete multiplier set
INSERT INTO pool_roi_multipliers (fund_id, investment_level_id, multiplier)
SELECT f.id, pil.id, CASE pil.sort_order
  WHEN 1 THEN 2.00
  WHEN 2 THEN 2.30
  ELSE 2.50
END
FROM funds f
CROSS JOIN platform_investment_levels pil
WHERE pil.is_active = true
ON CONFLICT (fund_id, investment_level_id) DO NOTHING;

-- Backfill ROI v2 fields on investment allocations
UPDATE investment_allocations ia
SET
  investment_level_id = matched.level_id,
  roi_multiplier = matched.multiplier,
  projected_payout = ROUND(ia.amount * matched.multiplier, 2)
FROM (
  SELECT
    ia2.id AS allocation_id,
    pil.id AS level_id,
    prm.multiplier AS multiplier
  FROM investment_allocations ia2
  JOIN investment_cycles ic ON ic.id = ia2.investment_cycle_id
  JOIN platform_investment_levels pil ON pil.is_active = true
    AND ia2.amount >= pil.min_amount
    AND (pil.max_amount IS NULL OR ia2.amount <= pil.max_amount)
  JOIN pool_roi_multipliers prm ON prm.fund_id = ic.fund_id
    AND prm.investment_level_id = pil.id
  WHERE ia2.roi_multiplier IS NULL
    AND ic.fund_id IS NOT NULL
) AS matched
WHERE ia.id = matched.allocation_id;

-- Drop legacy ROI column (single source of truth: pool_roi_multipliers)
ALTER TABLE funds DROP COLUMN IF EXISTS return_tiers;

COMMENT ON TABLE pool_roi_multipliers IS
  'Single source of truth for per-pool ROI multiplier targets.';
