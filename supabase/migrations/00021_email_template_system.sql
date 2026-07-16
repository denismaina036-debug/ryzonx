-- =============================================================================
-- RyvonX Communication System — Phase 5.5.2 Premium Email Templates
-- Versioning, email_spec JSON, archive support
-- =============================================================================

ALTER TABLE communication_templates
  ADD COLUMN IF NOT EXISTS email_spec JSONB,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_communication_templates_archived
  ON communication_templates (is_archived, category, name);

-- Immutable version history — never overwrite published templates
CREATE TABLE IF NOT EXISTS communication_template_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES communication_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  category communication_category NOT NULL,
  description TEXT,
  subject_template TEXT,
  body_template TEXT NOT NULL,
  in_app_title_template TEXT,
  in_app_body_template TEXT,
  variables_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_channels communication_channel[] NOT NULL DEFAULT ARRAY['in_app']::communication_channel[],
  email_spec JSONB,
  change_notes TEXT,
  edited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_communication_template_versions_template
  ON communication_template_versions (template_id, version_number DESC);

ALTER TABLE communication_template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY communication_template_versions_admin_all ON communication_template_versions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'administrator'
    )
  );

-- Test email queue (no Resend send — records intent for admin verification)
CREATE TABLE IF NOT EXISTS communication_template_test_sends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES communication_templates(id) ON DELETE SET NULL,
  template_slug TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  rendered_subject TEXT,
  rendered_html TEXT,
  rendered_plain_text TEXT,
  sent_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status communication_status NOT NULL DEFAULT 'queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_communication_template_test_sends_created
  ON communication_template_test_sends (created_at DESC);

ALTER TABLE communication_template_test_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY communication_template_test_sends_admin_all ON communication_template_test_sends
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'administrator'
    )
  );

COMMENT ON COLUMN communication_templates.email_spec IS
  'Premium email layout spec (title, intro, blocks, actions) for renderPremiumEmail()';

COMMENT ON TABLE communication_template_versions IS
  'Immutable template version history for admin compare/restore workflows';
