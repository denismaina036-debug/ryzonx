-- Admin-seeded public display metrics (baseline until live platform data exceeds them).

ALTER TABLE pool_managers
  ADD COLUMN IF NOT EXISTS display_review_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS display_trade_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS display_investor_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE funds
  ADD COLUMN IF NOT EXISTS display_active_investors INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN pool_managers.display_review_count IS 'Admin-set public review count shown until live reviews exceed this value.';
COMMENT ON COLUMN pool_managers.display_trade_count IS 'Admin-set public trade count from funded account reviews.';
COMMENT ON COLUMN pool_managers.display_investor_count IS 'Admin-set manager investor baseline for public display.';
COMMENT ON COLUMN funds.display_active_investors IS 'Admin-set initial investor count for marketplace display.';
