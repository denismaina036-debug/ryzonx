-- =============================================================================
-- Migration 068: Mobile payment intents and exactly-once settlement
-- =============================================================================

CREATE TABLE IF NOT EXISTS mobile_payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  transaction_id UUID NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL CHECK (provider IN ('megapay')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('mpesa')),
  status TEXT NOT NULL DEFAULT 'created' CHECK (
    status IN ('created', 'initiating', 'prompt_sent', 'processing', 'completed', 'failed', 'cancelled', 'expired')
  ),
  reference TEXT NOT NULL UNIQUE,
  phone_e164 TEXT NOT NULL CHECK (phone_e164 ~ '^2547[0-9]{8}$'),
  usd_amount NUMERIC(18, 2) NOT NULL CHECK (usd_amount > 0),
  kes_amount NUMERIC(18, 2) NOT NULL CHECK (kes_amount >= 1),
  kes_per_usd NUMERIC(18, 6) NOT NULL CHECK (kes_per_usd > 0),
  provider_request_id TEXT UNIQUE,
  merchant_request_id TEXT,
  checkout_request_id TEXT,
  provider_transaction_id TEXT,
  provider_receipt TEXT UNIQUE,
  response_code TEXT,
  response_description TEXT,
  initiated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes'),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mobile_payment_intents_user_created
  ON mobile_payment_intents (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mobile_payment_intents_status
  ON mobile_payment_intents (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mobile_payment_intents_provider_request
  ON mobile_payment_intents (provider_request_id)
  WHERE provider_request_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS mobile_payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_key TEXT NOT NULL,
  intent_id UUID REFERENCES mobile_payment_intents(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'received' CHECK (
    processing_status IN ('received', 'processed', 'ignored', 'failed')
  ),
  processing_error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  UNIQUE (provider, event_key)
);

ALTER TABLE mobile_payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_payment_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mobile_payment_intents_own_read ON mobile_payment_intents;
CREATE POLICY mobile_payment_intents_own_read ON mobile_payment_intents
  FOR SELECT USING (auth.uid() = user_id OR get_user_role() = 'administrator');

DROP POLICY IF EXISTS mobile_payment_intents_admin_all ON mobile_payment_intents;
CREATE POLICY mobile_payment_intents_admin_all ON mobile_payment_intents
  FOR ALL USING (get_user_role() = 'administrator')
  WITH CHECK (get_user_role() = 'administrator');

DROP POLICY IF EXISTS mobile_payment_webhook_events_admin_read ON mobile_payment_webhook_events;
CREATE POLICY mobile_payment_webhook_events_admin_read ON mobile_payment_webhook_events
  FOR SELECT USING (get_user_role() = 'administrator');

DROP TRIGGER IF EXISTS mobile_payment_intents_updated_at ON mobile_payment_intents;
CREATE TRIGGER mobile_payment_intents_updated_at
  BEFORE UPDATE ON mobile_payment_intents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_mobile_payment_once
  ON ledger_transactions (source_type, source_id)
  WHERE source_type = 'mobile_payment'
    AND source_id IS NOT NULL
    AND status <> 'reversed';

CREATE OR REPLACE FUNCTION settle_mobile_payment(
  p_intent_id UUID,
  p_provider_transaction_id TEXT,
  p_provider_receipt TEXT,
  p_response_code TEXT,
  p_response_description TEXT,
  p_provider_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_intent mobile_payment_intents%ROWTYPE;
  v_available_account_id UUID;
  v_suspense_account_id UUID;
  v_ledger_transaction_id UUID;
  v_default_fund CONSTANT UUID := '00000000-0000-4000-a000-000000000001'::UUID;
BEGIN
  SELECT * INTO v_intent
  FROM mobile_payment_intents
  WHERE id = p_intent_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mobile payment intent not found.';
  END IF;

  IF v_intent.status = 'completed' THEN
    RETURN false;
  END IF;

  IF v_intent.status NOT IN ('prompt_sent', 'processing', 'initiating') THEN
    RAISE EXCEPTION 'Mobile payment intent cannot be settled from status %.', v_intent.status;
  END IF;

  IF nullif(trim(COALESCE(p_provider_receipt, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Provider receipt is required.';
  END IF;

  INSERT INTO investor_portfolios (
    user_id, fund_id, available_balance, total_deposits
  ) VALUES (
    v_intent.user_id, v_default_fund, 0, 0
  ) ON CONFLICT (user_id, fund_id) DO NOTHING;

  INSERT INTO ledger_accounts (
    code, name, account_type, owner_type, owner_id, currency, is_active
  ) VALUES (
    'INVESTOR_' || upper(substr(replace(v_intent.user_id::text, '-', ''), 1, 12)) || '_AVAILABLE',
    'Investor Available (' || substr(v_intent.user_id::text, 1, 8) || ')',
    'liability', 'investor', v_intent.user_id, 'USD', true
  )
  ON CONFLICT (code) DO UPDATE SET is_active = true
  RETURNING id INTO v_available_account_id;

  INSERT INTO ledger_accounts (
    code, name, account_type, owner_type, owner_id, currency, is_active
  ) VALUES (
    'PLATFORM_SUSPENSE', 'RyvonX Platform Suspense', 'asset', 'platform', NULL, 'USD', true
  )
  ON CONFLICT (code) DO UPDATE SET is_active = true
  RETURNING id INTO v_suspense_account_id;

  INSERT INTO ledger_transactions (
    reference, description, transaction_type, status, source_type, source_id, actor_id, metadata
  ) VALUES (
    'RVX-LDG-MP-' || upper(substr(replace(v_intent.id::text, '-', ''), 1, 16)),
    'M-Pesa deposit settled — ' || v_intent.reference,
    'deposit_credit', 'posted', 'mobile_payment', v_intent.id, v_intent.user_id,
    jsonb_build_object(
      'provider', v_intent.provider,
      'method', v_intent.payment_method,
      'kesAmount', v_intent.kes_amount,
      'kesPerUsd', v_intent.kes_per_usd,
      'providerReceipt', p_provider_receipt
    )
  )
  RETURNING id INTO v_ledger_transaction_id;

  INSERT INTO ledger_entries (transaction_id, account_id, entry_side, amount, currency, memo)
  VALUES
    (v_ledger_transaction_id, v_suspense_account_id, 'debit', v_intent.usd_amount, 'USD', 'M-Pesa settlement'),
    (v_ledger_transaction_id, v_available_account_id, 'credit', v_intent.usd_amount, 'USD', 'Funding wallet credit');

  UPDATE transactions
  SET
    status = 'approved',
    reference = COALESCE(nullif(trim(p_provider_receipt), ''), reference),
    processed_at = now(),
    notes = 'M-Pesa deposit — KES ' || to_char(v_intent.kes_amount, 'FM999999999990.00') ||
      ' · USD ' || to_char(v_intent.usd_amount, 'FM999999999990.00'),
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'mobilePaymentIntentId', v_intent.id,
      'provider', v_intent.provider,
      'providerReceipt', p_provider_receipt,
      'providerTransactionId', p_provider_transaction_id,
      'kesAmount', v_intent.kes_amount,
      'kesPerUsd', v_intent.kes_per_usd
    ),
    updated_at = now()
  WHERE id = v_intent.transaction_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending Ryvonx deposit transaction not found.';
  END IF;

  UPDATE investor_portfolios
  SET
    available_balance = COALESCE(available_balance, 0) + v_intent.usd_amount,
    total_deposits = COALESCE(total_deposits, 0) + v_intent.usd_amount,
    last_deposit_at = now(),
    updated_at = now()
  WHERE user_id = v_intent.user_id AND fund_id = v_default_fund;

  UPDATE mobile_payment_intents
  SET
    status = 'completed',
    provider_transaction_id = nullif(trim(p_provider_transaction_id), ''),
    provider_receipt = trim(p_provider_receipt),
    response_code = p_response_code,
    response_description = p_response_description,
    completed_at = now(),
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('settlementPayload', p_provider_payload),
    updated_at = now()
  WHERE id = v_intent.id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION settle_mobile_payment(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION settle_mobile_payment(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;

