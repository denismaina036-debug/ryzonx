-- =============================================================================
-- Migration 067: Referral program
-- One attribution per referred account and one reward after the first successful
-- wallet-backed pool investment. Reward values are snapshotted at qualification.
-- =============================================================================

CREATE TABLE IF NOT EXISTS referral_codes (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT referral_codes_code_nonempty CHECK (char_length(trim(code)) >= 8)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_codes_code_case_insensitive
  ON referral_codes (upper(code));

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'qualified', 'rewarded', 'cancelled')),
  qualifying_transaction_id UUID UNIQUE REFERENCES transactions(id) ON DELETE SET NULL,
  reward_transaction_id UUID UNIQUE REFERENCES transactions(id) ON DELETE SET NULL,
  reward_amount NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (reward_amount >= 0),
  qualified_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT referrals_no_self_referral CHECK (referrer_id <> referred_user_id),
  CONSTRAINT referrals_code_fk FOREIGN KEY (referral_code)
    REFERENCES referral_codes(code) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_status
  ON referrals (referrer_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_referrals_referred_status
  ON referrals (referred_user_id, status);

-- Prevent duplicate reward records if a request is retried concurrently.
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_referral_reward_once
  ON transactions ((metadata ->> 'referralId'))
  WHERE payment_method = 'reward'
    AND metadata ? 'referralId';

-- Prevent a referral reward from being posted to the ledger more than once.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_referral_reward_once
  ON ledger_transactions (source_type, source_id)
  WHERE source_type = 'referral_reward'
    AND source_id IS NOT NULL
    AND status <> 'reversed';

INSERT INTO platform_settings (key, value, description)
VALUES (
  'referral_reward_amount',
  '5'::jsonb,
  'USD credited to a referrer after the referred user makes their first pool investment.'
)
ON CONFLICT (key) DO NOTHING;

UPDATE platform_settings
SET value = jsonb_set(COALESCE(value, '{}'::jsonb), '{referralProgram}', 'true'::jsonb, true)
WHERE key = 'feature_flags'
  AND jsonb_typeof(value) = 'object';

-- Existing users receive stable, unique referral codes.
INSERT INTO referral_codes (user_id, code)
SELECT
  p.id,
  'RX-' || upper(replace(p.id::text, '-', ''))
FROM profiles p
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION ensure_profile_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO referral_codes (user_id, code)
  VALUES (NEW.id, 'RX-' || upper(replace(NEW.id::text, '-', '')))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_referral_code ON profiles;
CREATE TRIGGER trg_profiles_referral_code
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION ensure_profile_referral_code();

CREATE OR REPLACE FUNCTION finalize_referral_reward(
  p_referred_user_id UUID,
  p_qualifying_transaction_id UUID,
  p_reward_amount NUMERIC
)
RETURNS TABLE (
  referral_id UUID,
  referrer_id UUID,
  reward_amount NUMERIC,
  reward_transaction_id UUID,
  rewarded_now BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral referrals%ROWTYPE;
  v_source transactions%ROWTYPE;
  v_reward NUMERIC(18, 2);
  v_reward_tx_id UUID;
  v_available_account_id UUID;
  v_suspense_account_id UUID;
  v_ledger_tx_id UUID;
  v_referred_name TEXT;
  v_default_fund CONSTANT UUID := '00000000-0000-4000-a000-000000000001'::UUID;
BEGIN
  SELECT * INTO v_source
  FROM transactions
  WHERE id = p_qualifying_transaction_id
    AND user_id = p_referred_user_id
    AND payment_method = 'pool_allocation'
    AND status IN ('pending', 'completed')
    AND amount > 0;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'A successful pool investment is required to qualify a referral.';
  END IF;

  SELECT * INTO v_referral
  FROM referrals
  WHERE referred_user_id = p_referred_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_referral.status = 'cancelled' THEN
    RETURN;
  END IF;

  IF v_referral.status = 'rewarded' THEN
    RETURN QUERY SELECT
      v_referral.id,
      v_referral.referrer_id,
      v_referral.reward_amount,
      v_referral.reward_transaction_id,
      false;
    RETURN;
  END IF;

  v_reward := CASE
    WHEN v_referral.reward_amount > 0 THEN v_referral.reward_amount
    ELSE ROUND(GREATEST(COALESCE(p_reward_amount, 0), 0), 2)
  END;

  IF v_reward <= 0 THEN
    UPDATE referrals
    SET
      status = 'rewarded',
      qualifying_transaction_id = p_qualifying_transaction_id,
      reward_amount = 0,
      qualified_at = COALESCE(qualified_at, now()),
      rewarded_at = now(),
      updated_at = now()
    WHERE id = v_referral.id;

    RETURN QUERY SELECT v_referral.id, v_referral.referrer_id, 0::NUMERIC, NULL::UUID, true;
    RETURN;
  END IF;

  SELECT full_name INTO v_referred_name
  FROM profiles
  WHERE id = p_referred_user_id;

  INSERT INTO transactions (
    user_id,
    fund_id,
    type,
    amount,
    status,
    payment_method,
    notes,
    transaction_reference,
    metadata
  ) VALUES (
    v_referral.referrer_id,
    v_default_fund,
    'adjustment',
    v_reward,
    'completed',
    'reward',
    'Referral reward' || CASE
      WHEN nullif(trim(COALESCE(v_referred_name, '')), '') IS NULL THEN ''
      ELSE ' — ' || trim(v_referred_name) || ' joined and invested'
    END,
    next_transaction_reference('RWD'),
    jsonb_build_object(
      'currency', 'USD',
      'referralId', v_referral.id,
      'referredUserId', p_referred_user_id,
      'qualifyingTransactionId', p_qualifying_transaction_id
    )
  )
  RETURNING id INTO v_reward_tx_id;

  INSERT INTO ledger_accounts (
    code,
    name,
    account_type,
    owner_type,
    owner_id,
    currency,
    is_active
  ) VALUES (
    'INVESTOR_' || upper(substr(replace(v_referral.referrer_id::text, '-', ''), 1, 12)) || '_AVAILABLE',
    'Investor Available (' || substr(v_referral.referrer_id::text, 1, 8) || ')',
    'liability',
    'investor',
    v_referral.referrer_id,
    'USD',
    true
  )
  ON CONFLICT (code) DO UPDATE SET is_active = true
  RETURNING id INTO v_available_account_id;

  INSERT INTO ledger_accounts (
    code,
    name,
    account_type,
    owner_type,
    owner_id,
    currency,
    is_active
  ) VALUES (
    'PLATFORM_SUSPENSE',
    'RyvonX Platform Suspense',
    'asset',
    'platform',
    NULL,
    'USD',
    true
  )
  ON CONFLICT (code) DO UPDATE SET is_active = true
  RETURNING id INTO v_suspense_account_id;

  INSERT INTO ledger_transactions (
    reference,
    description,
    transaction_type,
    status,
    source_type,
    source_id,
    actor_id,
    metadata
  ) VALUES (
    'RVX-LDG-RWD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
    'Referral reward credited to Funding Wallet',
    'transfer',
    'posted',
    'referral_reward',
    v_reward_tx_id,
    p_referred_user_id,
    jsonb_build_object('referralId', v_referral.id)
  )
  RETURNING id INTO v_ledger_tx_id;

  INSERT INTO ledger_entries (transaction_id, account_id, entry_side, amount, currency, memo)
  VALUES
    (v_ledger_tx_id, v_suspense_account_id, 'debit', v_reward, 'USD', 'Referral program reward'),
    (v_ledger_tx_id, v_available_account_id, 'credit', v_reward, 'USD', 'Referral program reward');

  INSERT INTO investor_portfolios (user_id, fund_id, available_balance)
  VALUES (v_referral.referrer_id, v_default_fund, v_reward)
  ON CONFLICT (user_id, fund_id) DO UPDATE
  SET available_balance = ROUND((COALESCE(investor_portfolios.available_balance, 0) + v_reward)::NUMERIC, 2);

  UPDATE referrals
  SET
    status = 'rewarded',
    qualifying_transaction_id = p_qualifying_transaction_id,
    reward_transaction_id = v_reward_tx_id,
    reward_amount = v_reward,
    qualified_at = COALESCE(qualified_at, now()),
    rewarded_at = now(),
    updated_at = now()
  WHERE id = v_referral.id;

  INSERT INTO notifications (user_id, type, title, message, metadata)
  VALUES (
    v_referral.referrer_id,
    'system',
    'Referral reward received',
    '$' || trim(to_char(v_reward, 'FM999999999990.00')) || ' was added to your Funding Wallet.',
    jsonb_build_object('referralId', v_referral.id, 'transactionId', v_reward_tx_id)
  );

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_values)
  VALUES (
    p_referred_user_id,
    'ledger_transaction_posted',
    'ledger_transaction',
    v_ledger_tx_id,
    jsonb_build_object(
      'transactionType', 'transfer',
      'sourceType', 'referral_reward',
      'referralId', v_referral.id,
      'rewardAmount', v_reward
    )
  );

  RETURN QUERY
  SELECT v_referral.id, v_referral.referrer_id, v_reward, v_reward_tx_id, true;
END;
$$;

REVOKE ALL ON FUNCTION finalize_referral_reward(UUID, UUID, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finalize_referral_reward(UUID, UUID, NUMERIC) TO service_role;

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS referral_codes_owner_read ON referral_codes;
CREATE POLICY referral_codes_owner_read ON referral_codes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS referral_codes_admin_all ON referral_codes;
CREATE POLICY referral_codes_admin_all ON referral_codes
  FOR ALL
  USING (get_user_role() = 'administrator')
  WITH CHECK (get_user_role() = 'administrator');

DROP POLICY IF EXISTS referrals_participant_read ON referrals;
CREATE POLICY referrals_participant_read ON referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

DROP POLICY IF EXISTS referrals_admin_all ON referrals;
CREATE POLICY referrals_admin_all ON referrals
  FOR ALL
  USING (get_user_role() = 'administrator')
  WITH CHECK (get_user_role() = 'administrator');

DROP TRIGGER IF EXISTS set_referral_codes_updated_at ON referral_codes;
CREATE TRIGGER set_referral_codes_updated_at
  BEFORE UPDATE ON referral_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_referrals_updated_at ON referrals;
CREATE TRIGGER set_referrals_updated_at
  BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE referral_codes IS
  'Stable shareable referral codes, one per RyvonX profile.';

COMMENT ON TABLE referrals IS
  'Referral attribution and one-time reward state. Reward amounts are immutable historical snapshots.';
