-- Pool card presentation and admin management fields

ALTER TABLE funds
  ADD COLUMN IF NOT EXISTS card_background_color TEXT,
  ADD COLUMN IF NOT EXISTS pool_manager_name TEXT,
  ADD COLUMN IF NOT EXISTS pool_manager_icon_url TEXT;

COMMENT ON COLUMN funds.card_background_color IS 'Hex color for investor pool card background';
COMMENT ON COLUMN funds.pool_manager_name IS 'Displayed pool manager name';
COMMENT ON COLUMN funds.pool_manager_icon_url IS 'URL for pool manager avatar/icon';
