-- Telegram as a native, server-only Communication Center integration.

ALTER TYPE communication_channel ADD VALUE IF NOT EXISTS 'telegram';

CREATE TABLE IF NOT EXISTS communication_integrations (
  provider TEXT PRIMARY KEY CHECK (provider IN ('telegram')),
  enabled BOOLEAN NOT NULL DEFAULT false,
  encrypted_secret TEXT,
  secret_last_four TEXT,
  destination_id TEXT,
  append_website_link BOOLEAN NOT NULL DEFAULT true,
  bot_username TEXT,
  destination_title TEXT,
  last_tested_at TIMESTAMPTZ,
  last_test_status TEXT CHECK (last_test_status IS NULL OR last_test_status IN ('success', 'failed')),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT communication_integrations_destination_nonempty CHECK (
    destination_id IS NULL OR char_length(trim(destination_id)) > 0
  )
);

ALTER TABLE communication_integrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE communication_integrations FROM anon, authenticated;

DROP TRIGGER IF EXISTS communication_integrations_updated_at ON communication_integrations;
CREATE TRIGGER communication_integrations_updated_at
  BEFORE UPDATE ON communication_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- One protected provider publication per communication and destination. This
-- claim is created before the external request, preventing double-click races.
CREATE TABLE IF NOT EXISTS communication_provider_publications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  communication_id UUID NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
  delivery_id UUID NOT NULL REFERENCES communication_deliveries(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('telegram')),
  destination_id TEXT NOT NULL,
  status communication_status NOT NULL DEFAULT 'sending',
  external_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  failure_category TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 1 CHECK (attempt_count > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (communication_id, provider, destination_id),
  UNIQUE (delivery_id)
);

ALTER TABLE communication_provider_publications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE communication_provider_publications FROM anon, authenticated;

DROP TRIGGER IF EXISTS communication_provider_publications_updated_at ON communication_provider_publications;
CREATE TRIGGER communication_provider_publications_updated_at
  BEFORE UPDATE ON communication_provider_publications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_communication_provider_publications_status
  ON communication_provider_publications (provider, status, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_communications_admin_telegram_request
  ON communications (related_entity_type, related_entity_id)
  WHERE related_entity_type = 'admin_telegram_broadcast';
