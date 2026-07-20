-- Adjustable focal point for pool cover images (marketplace cards + detail hero)

ALTER TABLE funds
  ADD COLUMN IF NOT EXISTS cover_image_position JSONB NOT NULL
  DEFAULT '{"x": 50, "y": 50}'::jsonb;

COMMENT ON COLUMN funds.cover_image_position IS
  'Cover image focal point as {x,y} percentages (0-100) for CSS background/object-position.';
