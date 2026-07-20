-- Pool Manager public identity: username, name visibility, social links

ALTER TABLE pool_managers
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS show_full_name BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE pool_managers
SET username = slug
WHERE username IS NULL AND slug IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pool_managers_username
  ON pool_managers (username)
  WHERE username IS NOT NULL;

COMMENT ON COLUMN pool_managers.username IS 'Public handle — default display name on marketplace and manager profile URL slug.';
COMMENT ON COLUMN pool_managers.show_full_name IS 'When true, legal display_name is shown alongside username on public pages.';
COMMENT ON COLUMN pool_managers.social_links IS 'JSON map of platform -> { url, isPublic }';
