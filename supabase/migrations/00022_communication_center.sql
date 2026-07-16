-- =============================================================================
-- RyvonX Communication Center — Phase 5.5.4
-- Settings, announcement lifecycle, campaign metadata
-- =============================================================================

CREATE TABLE IF NOT EXISTS communication_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE communication_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY communication_settings_admin_all ON communication_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'administrator'
    )
  );

-- Extend announcements for Communication Center lifecycle
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'platform_update',
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS preview TEXT,
  ADD COLUMN IF NOT EXISTS send_email BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS communication_id UUID REFERENCES communications(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements (status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements (is_published, published_at DESC);

-- Extend broadcast campaigns for Communication Center UI
ALTER TABLE broadcast_campaigns
  ADD COLUMN IF NOT EXISTS name_display TEXT,
  ADD COLUMN IF NOT EXISTS template_slug TEXT,
  ADD COLUMN IF NOT EXISTS subject_override TEXT,
  ADD COLUMN IF NOT EXISTS preview_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_stats JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON TABLE communication_settings IS 'Global Communication Center configuration (sender, footer, defaults)';

-- Default settings seed
INSERT INTO communication_settings (key, value) VALUES
  ('sender', '{"name":"RyvonX","email":"notifications@ryvonx.com","reply_to":"support@ryvonx.com"}'::jsonb),
  ('support', '{"email":"support@ryvonx.com"}'::jsonb),
  ('footer', '{"company":"RyvonX","address":"RyvonX Wealth Management","privacy_url":"/privacy","terms_url":"/terms"}'::jsonb),
  ('social', '{"website":"https://ryvonx.com","twitter":"","linkedin":""}'::jsonb),
  ('defaults', '{"channels":["email","in_app"],"critical_bypass_preferences":true}'::jsonb)
ON CONFLICT (key) DO NOTHING;
