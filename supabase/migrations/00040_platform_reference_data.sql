-- Platform Reference Data: centralized lookup tables for markets, instruments, countries, etc.

CREATE TABLE IF NOT EXISTS platform_reference_sets (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_admin_managed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform_reference_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  set_key TEXT NOT NULL REFERENCES platform_reference_sets(key) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  parent_code TEXT,
  search_text TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_reference_items_unique UNIQUE (set_key, code)
);

CREATE INDEX IF NOT EXISTS idx_reference_items_set
  ON platform_reference_items (set_key, is_enabled, is_archived, sort_order);

CREATE INDEX IF NOT EXISTS idx_reference_items_parent
  ON platform_reference_items (set_key, parent_code)
  WHERE parent_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reference_items_search
  ON platform_reference_items USING gin (to_tsvector('simple', search_text));

ALTER TABLE platform_reference_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_reference_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reference sets"
  ON platform_reference_sets FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read enabled reference items"
  ON platform_reference_items FOR SELECT
  USING (is_enabled = true AND is_archived = false);

CREATE POLICY "Admins manage reference sets"
  ON platform_reference_sets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'administrator'
    )
  );

CREATE POLICY "Admins manage reference items"
  ON platform_reference_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'administrator'
    )
  );

CREATE TRIGGER platform_reference_sets_updated_at
  BEFORE UPDATE ON platform_reference_sets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER platform_reference_items_updated_at
  BEFORE UPDATE ON platform_reference_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
