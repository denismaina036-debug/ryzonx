-- =============================================================================
-- Migration 069: Encrypted payment-provider configuration
-- Secrets are readable only through the server service role. No RLS policy
-- grants browser clients direct access, including administrator clients.
-- =============================================================================

CREATE TABLE IF NOT EXISTS payment_provider_configs (
  provider TEXT PRIMARY KEY CHECK (provider IN ('megapay')),
  encrypted_api_key TEXT,
  api_key_last_four TEXT,
  account_email TEXT,
  kes_per_usd NUMERIC(18, 6) CHECK (kes_per_usd IS NULL OR kes_per_usd > 0),
  initiate_url TEXT NOT NULL DEFAULT 'https://megapay.co.ke/backend/v1/initiatestk',
  status_url TEXT NOT NULL DEFAULT 'https://megapay.co.ke/backend/v1/transactionstatus',
  request_timeout_ms INTEGER NOT NULL DEFAULT 20000 CHECK (request_timeout_ms BETWEEN 5000 AND 60000),
  merchant_display_name TEXT NOT NULL DEFAULT 'RYVONX',
  webhook_registered BOOLEAN NOT NULL DEFAULT false,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payment_provider_configs_email_valid CHECK (
    account_email IS NULL OR account_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  CONSTRAINT payment_provider_configs_initiate_https CHECK (initiate_url ~ '^https://'),
  CONSTRAINT payment_provider_configs_status_https CHECK (status_url ~ '^https://'),
  CONSTRAINT payment_provider_configs_merchant_name_nonempty CHECK (char_length(trim(merchant_display_name)) > 0)
);

ALTER TABLE payment_provider_configs ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS payment_provider_configs_updated_at ON payment_provider_configs;
CREATE TRIGGER payment_provider_configs_updated_at
  BEFORE UPDATE ON payment_provider_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

REVOKE ALL ON TABLE payment_provider_configs FROM anon, authenticated;
