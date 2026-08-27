-- Financial event atomicity and conservative state reconciliation.
-- The ledger remains the source of truth; this migration only makes posting
-- a balanced transaction all-or-nothing and gives callers an idempotency key.

ALTER TABLE ledger_transactions
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_transactions_idempotency_key
  ON ledger_transactions(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS investor_profit_wallet_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL UNIQUE,
  investor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  source_cycle_id UUID REFERENCES investment_cycles(id) ON DELETE SET NULL,
  amount NUMERIC(18, 2) NOT NULL CHECK (amount <> 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE investor_profit_wallet_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE investment_queue
  ADD COLUMN IF NOT EXISTS cycle_settlement_id UUID
    REFERENCES cycle_investor_settlements(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_investment_queue_cycle_settlement_reinvestment
  ON investment_queue(cycle_settlement_id)
  WHERE queue_type = 'reinvestment' AND cycle_settlement_id IS NOT NULL;

CREATE OR REPLACE FUNCTION credit_investor_profit_wallet_once(
  p_investor_id UUID,
  p_fund_id UUID,
  p_source_cycle_id UUID,
  p_amount NUMERIC,
  p_event_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created BOOLEAN := false;
  v_row_count INTEGER := 0;
  v_balance NUMERIC(18, 2);
BEGIN
  IF round(p_amount, 2) <= 0 THEN
    RAISE EXCEPTION 'Profit wallet credit must be positive';
  END IF;

  INSERT INTO investor_profit_wallet_events (
    event_key, investor_id, fund_id, source_cycle_id, amount
  ) VALUES (
    p_event_key, p_investor_id, p_fund_id, p_source_cycle_id, round(p_amount, 2)
  )
  ON CONFLICT (event_key) DO NOTHING;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  v_created := v_row_count > 0;

  IF v_created THEN
    INSERT INTO investor_profit_wallets (
      investor_id, fund_id, source_cycle_id, balance
    ) VALUES (
      p_investor_id, p_fund_id, p_source_cycle_id, round(p_amount, 2)
    )
    ON CONFLICT (investor_id, fund_id, (COALESCE(source_cycle_id, '00000000-0000-0000-0000-000000000000'::UUID)))
    DO UPDATE SET
      balance = investor_profit_wallets.balance + EXCLUDED.balance,
      updated_at = now();
  END IF;

  SELECT balance INTO v_balance
  FROM investor_profit_wallets
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND source_cycle_id IS NOT DISTINCT FROM p_source_cycle_id;

  RETURN jsonb_build_object(
    'balance', COALESCE(v_balance, 0),
    'created', v_created
  );
END;
$$;

REVOKE ALL ON FUNCTION credit_investor_profit_wallet_once(UUID, UUID, UUID, NUMERIC, TEXT)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION credit_investor_profit_wallet_once(UUID, UUID, UUID, NUMERIC, TEXT)
  TO service_role;

CREATE OR REPLACE FUNCTION post_ledger_transaction_atomic(
  p_reference TEXT,
  p_description TEXT,
  p_transaction_type ledger_transaction_type,
  p_source_type TEXT,
  p_source_id UUID,
  p_actor_id UUID,
  p_metadata JSONB,
  p_idempotency_key TEXT,
  p_entries JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction ledger_transactions%ROWTYPE;
  v_debits NUMERIC(18, 2);
  v_credits NUMERIC(18, 2);
  v_created BOOLEAN := false;
  v_entries JSONB;
BEGIN
  IF jsonb_typeof(p_entries) <> 'array' OR jsonb_array_length(p_entries) < 2 THEN
    RAISE EXCEPTION 'A ledger transaction requires at least two entries';
  END IF;

  SELECT
    COALESCE(SUM((entry->>'amount')::NUMERIC) FILTER (WHERE entry->>'entrySide' = 'debit'), 0),
    COALESCE(SUM((entry->>'amount')::NUMERIC) FILTER (WHERE entry->>'entrySide' = 'credit'), 0)
  INTO v_debits, v_credits
  FROM jsonb_array_elements(p_entries) entry;

  IF v_debits <= 0 OR v_credits <= 0 OR v_debits <> v_credits THEN
    RAISE EXCEPTION 'Ledger entries are not balanced: debits=% credits=%', v_debits, v_credits;
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_entries) entry
    WHERE (entry->>'amount')::NUMERIC <= 0
       OR entry->>'entrySide' NOT IN ('debit', 'credit')
  ) THEN
    RAISE EXCEPTION 'Ledger entries contain an invalid amount or side';
  END IF;

  INSERT INTO ledger_transactions (
    reference, description, transaction_type, status, source_type, source_id,
    actor_id, metadata, idempotency_key
  ) VALUES (
    p_reference, p_description, p_transaction_type, 'posted', p_source_type,
    p_source_id, p_actor_id, COALESCE(p_metadata, '{}'::jsonb), p_idempotency_key
  )
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
  RETURNING * INTO v_transaction;

  IF v_transaction.id IS NULL THEN
    SELECT * INTO v_transaction
    FROM ledger_transactions
    WHERE idempotency_key = p_idempotency_key;
  ELSE
    v_created := true;

    INSERT INTO ledger_entries (
      transaction_id, account_id, entry_side, amount, currency, memo
    )
    SELECT
      v_transaction.id,
      (entry->>'accountId')::UUID,
      (entry->>'entrySide')::ledger_entry_side,
      (entry->>'amount')::NUMERIC(18, 2),
      'USD',
      NULLIF(entry->>'memo', '')
    FROM jsonb_array_elements(p_entries) entry;
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(le) ORDER BY le.created_at, le.id), '[]'::jsonb)
  INTO v_entries
  FROM ledger_entries le
  WHERE le.transaction_id = v_transaction.id;

  RETURN jsonb_build_object(
    'transaction', to_jsonb(v_transaction),
    'entries', v_entries,
    'created', v_created
  );
END;
$$;

REVOKE ALL ON FUNCTION post_ledger_transaction_atomic(
  TEXT, TEXT, ledger_transaction_type, TEXT, UUID, UUID, JSONB, TEXT, JSONB
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION post_ledger_transaction_atomic(
  TEXT, TEXT, ledger_transaction_type, TEXT, UUID, UUID, JSONB, TEXT, JSONB
) TO service_role;

CREATE OR REPLACE FUNCTION reserve_withdrawal_atomic(
  p_investor_id UUID,
  p_amount NUMERIC,
  p_transaction_id UUID,
  p_available_account_id UUID,
  p_reserved_account_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available NUMERIC(18, 2);
  v_result JSONB;
BEGIN
  -- Serialize all reservations against this investor's available account.
  PERFORM id FROM ledger_accounts WHERE id = p_available_account_id FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM ledger_transactions
    WHERE idempotency_key = 'withdrawal:' || p_transaction_id::TEXT || ':reserve'
  ) THEN
    RETURN jsonb_build_object('created', false);
  END IF;

  SELECT COALESCE(SUM(CASE WHEN le.entry_side = 'credit' THEN le.amount ELSE -le.amount END), 0)
  INTO v_available
  FROM ledger_entries le
  JOIN ledger_transactions lt ON lt.id = le.transaction_id
  WHERE le.account_id = p_available_account_id
    AND lt.status = 'posted';

  IF round(p_amount, 2) <= 0 OR round(p_amount, 2) > v_available THEN
    RAISE EXCEPTION 'Insufficient available balance';
  END IF;

  v_result := post_ledger_transaction_atomic(
    'WDR-' || replace(p_transaction_id::TEXT, '-', ''),
    'Withdrawal reserved — ' || p_transaction_id::TEXT,
    'transfer',
    'withdrawal',
    p_transaction_id,
    p_investor_id,
    '{}'::jsonb,
    'withdrawal:' || p_transaction_id::TEXT || ':reserve',
    jsonb_build_array(
      jsonb_build_object('accountId', p_available_account_id, 'entrySide', 'debit', 'amount', round(p_amount, 2), 'memo', 'Withdrawal request'),
      jsonb_build_object('accountId', p_reserved_account_id, 'entrySide', 'credit', 'amount', round(p_amount, 2), 'memo', 'Withdrawal reserved')
    )
  );

  RETURN jsonb_build_object('created', COALESCE((v_result->>'created')::BOOLEAN, false));
END;
$$;

REVOKE ALL ON FUNCTION reserve_withdrawal_atomic(UUID, NUMERIC, UUID, UUID, UUID)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reserve_withdrawal_atomic(UUID, NUMERIC, UUID, UUID, UUID)
  TO service_role;

-- One-time bridge for accounts that predate the ledger. This records the
-- current legacy available balance as an auditable opening entry; afterwards
-- runtime projections no longer choose between two competing balances.
DO $$
DECLARE
  v_portfolio RECORD;
  v_available_account_id UUID;
  v_suspense_account_id UUID;
  v_ledger_balance NUMERIC(18, 2);
  v_delta NUMERIC(18, 2);
BEGIN
  SELECT id INTO v_suspense_account_id
  FROM ledger_accounts
  WHERE code = 'PLATFORM_SUSPENSE';

  FOR v_portfolio IN
    SELECT user_id, available_balance
    FROM investor_portfolios
    WHERE fund_id = '00000000-0000-4000-a000-000000000001'::UUID
      AND available_balance > 0
  LOOP
    INSERT INTO ledger_accounts (code, name, account_type, owner_type, owner_id)
    VALUES (
      'INVESTOR_' || upper(substr(replace(v_portfolio.user_id::TEXT, '-', ''), 1, 12)) || '_AVAILABLE',
      'Investor Available (' || substr(v_portfolio.user_id::TEXT, 1, 8) || ')',
      'liability', 'investor', v_portfolio.user_id
    )
    ON CONFLICT (code) DO UPDATE SET owner_id = EXCLUDED.owner_id
    RETURNING id INTO v_available_account_id;

    SELECT COALESCE(SUM(CASE WHEN le.entry_side = 'credit' THEN le.amount ELSE -le.amount END), 0)
    INTO v_ledger_balance
    FROM ledger_entries le
    JOIN ledger_transactions lt ON lt.id = le.transaction_id
    WHERE le.account_id = v_available_account_id
      AND lt.status = 'posted';

    v_delta := round(v_portfolio.available_balance - v_ledger_balance, 2);
    IF v_delta > 0 THEN
      PERFORM post_ledger_transaction_atomic(
        'OPEN-M77-' || replace(v_portfolio.user_id::TEXT, '-', ''),
        'Legacy funding wallet opening balance reconciliation',
        'opening_balance',
        'legacy_wallet_reconciliation',
        v_portfolio.user_id,
        NULL,
        jsonb_build_object('migration', '00077', 'legacy_balance', v_portfolio.available_balance),
        'migration77:opening:' || v_portfolio.user_id::TEXT,
        jsonb_build_array(
          jsonb_build_object('accountId', v_suspense_account_id, 'entrySide', 'debit', 'amount', v_delta, 'memo', 'Legacy balance source'),
          jsonb_build_object('accountId', v_available_account_id, 'entrySide', 'credit', 'amount', v_delta, 'memo', 'Funding wallet opening balance')
        )
      );
    ELSIF v_delta < 0 THEN
      UPDATE investor_portfolios
      SET available_balance = v_ledger_balance, updated_at = now()
      WHERE user_id = v_portfolio.user_id
        AND fund_id = '00000000-0000-4000-a000-000000000001'::UUID;
    END IF;
  END LOOP;
END;
$$;

-- Bridge pre-ledger profit-wallet balances by investor and pool. Cycle wallets
-- remain separate; the existing pool-profit ledger account is their aggregate.
DO $$
DECLARE
  v_wallet RECORD;
  v_profit_account_id UUID;
  v_suspense_account_id UUID;
  v_ledger_balance NUMERIC(18, 2);
  v_delta NUMERIC(18, 2);
BEGIN
  SELECT id INTO v_suspense_account_id
  FROM ledger_accounts
  WHERE code = 'PLATFORM_SUSPENSE';

  FOR v_wallet IN
    SELECT investor_id, fund_id, round(SUM(balance), 2) AS wallet_balance
    FROM investor_profit_wallets
    GROUP BY investor_id, fund_id
    HAVING round(SUM(balance), 2) > 0
  LOOP
    INSERT INTO ledger_accounts (code, name, account_type, owner_type, owner_id)
    VALUES (
      'INVESTOR_' || upper(substr(replace(v_wallet.investor_id::TEXT, '-', ''), 1, 8)) ||
        '_POOL_' || upper(substr(replace(v_wallet.fund_id::TEXT, '-', ''), 1, 8)) || '_PROFIT',
      'Pool Profit — legacy reconciliation',
      'liability', 'investor', v_wallet.investor_id
    )
    ON CONFLICT (code) DO UPDATE SET owner_id = EXCLUDED.owner_id
    RETURNING id INTO v_profit_account_id;

    SELECT COALESCE(SUM(CASE WHEN le.entry_side = 'credit' THEN le.amount ELSE -le.amount END), 0)
    INTO v_ledger_balance
    FROM ledger_entries le
    JOIN ledger_transactions lt ON lt.id = le.transaction_id
    WHERE le.account_id = v_profit_account_id
      AND lt.status = 'posted';

    v_delta := round(v_wallet.wallet_balance - v_ledger_balance, 2);
    IF v_delta > 0 THEN
      PERFORM post_ledger_transaction_atomic(
        'PROFIT-M77-' || substr(replace(v_wallet.investor_id::TEXT, '-', ''), 1, 12) ||
          '-' || substr(replace(v_wallet.fund_id::TEXT, '-', ''), 1, 12),
        'Legacy pool profit wallet opening balance reconciliation',
        'opening_balance',
        'legacy_profit_wallet_reconciliation',
        v_wallet.fund_id,
        NULL,
        jsonb_build_object('migration', '00077', 'investor_id', v_wallet.investor_id, 'wallet_balance', v_wallet.wallet_balance),
        'migration77:profit-opening:' || v_wallet.investor_id::TEXT || ':' || v_wallet.fund_id::TEXT,
        jsonb_build_array(
          jsonb_build_object('accountId', v_suspense_account_id, 'entrySide', 'debit', 'amount', v_delta, 'memo', 'Legacy pool profit source'),
          jsonb_build_object('accountId', v_profit_account_id, 'entrySide', 'credit', 'amount', v_delta, 'memo', 'Pool profit wallet opening balance')
        )
      );
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION transfer_cycle_profit_atomic(
  p_settlement_id UUID,
  p_investor_id UUID,
  p_requested_amount NUMERIC,
  p_profit_account_id UUID,
  p_available_account_id UUID,
  p_actor_id UUID,
  p_description TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settlement cycle_investor_settlements%ROWTYPE;
  v_wallet investor_profit_wallets%ROWTYPE;
  v_amount NUMERIC(18, 2);
  v_existing_amount NUMERIC(18, 2);
  v_status cycle_investor_settlement_status;
BEGIN
  SELECT * INTO v_settlement
  FROM cycle_investor_settlements
  WHERE id = p_settlement_id AND investor_id = p_investor_id
  FOR UPDATE;

  IF v_settlement.id IS NULL THEN
    RAISE EXCEPTION 'Settlement not found';
  END IF;

  IF v_settlement.profit_resolved THEN
    SELECT amount INTO v_existing_amount
    FROM transactions
    WHERE user_id = p_investor_id
      AND payment_method = 'profit_transfer'
      AND metadata->>'settlement_id' = p_settlement_id::TEXT
      AND status IN ('approved', 'completed')
    ORDER BY created_at DESC
    LIMIT 1;
    RETURN jsonb_build_object('transferred', COALESCE(v_existing_amount, 0), 'created', false);
  END IF;

  SELECT * INTO v_wallet
  FROM investor_profit_wallets
  WHERE investor_id = p_investor_id
    AND fund_id = v_settlement.fund_id
    AND source_cycle_id = v_settlement.investment_cycle_id
  FOR UPDATE;

  v_amount := round(LEAST(
    COALESCE(v_wallet.balance, 0),
    v_settlement.profit_amount,
    GREATEST(COALESCE(p_requested_amount, v_settlement.profit_amount), 0)
  ), 2);

  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'No cycle profit available to transfer';
  END IF;

  UPDATE investor_profit_wallets
  SET balance = balance - v_amount, updated_at = now()
  WHERE investor_id = p_investor_id
    AND fund_id = v_settlement.fund_id
    AND source_cycle_id = v_settlement.investment_cycle_id;

  PERFORM post_ledger_transaction_atomic(
    'CPT-' || replace(p_settlement_id::TEXT, '-', ''),
    p_description,
    'transfer',
    'cycle_investor_settlement',
    p_settlement_id,
    p_actor_id,
    jsonb_build_object('settlement_id', p_settlement_id),
    'cycle-settlement:' || p_settlement_id::TEXT || ':profit-transfer',
    jsonb_build_array(
      jsonb_build_object('accountId', p_profit_account_id, 'entrySide', 'debit', 'amount', v_amount, 'memo', 'Cycle profit released to Funding Wallet'),
      jsonb_build_object('accountId', p_available_account_id, 'entrySide', 'credit', 'amount', v_amount, 'memo', 'Cycle profit transferred to Funding Wallet')
    )
  );

  UPDATE investor_portfolios
  SET available_balance = available_balance + v_amount, updated_at = now()
  WHERE user_id = p_investor_id
    AND fund_id = '00000000-0000-4000-a000-000000000001'::UUID;

  INSERT INTO transactions (
    user_id, fund_id, type, amount, status, payment_method, notes, metadata,
    transaction_reference
  ) VALUES (
    p_investor_id, v_settlement.fund_id, 'adjustment', v_amount, 'completed',
    'profit_transfer', p_description,
    jsonb_build_object('settlement_id', p_settlement_id, 'cycle_id', v_settlement.investment_cycle_id),
    next_transaction_reference('PFT')
  );

  v_status := CASE
    WHEN v_settlement.capital_resolved OR v_settlement.principal_amount <= 0
      THEN 'closed'::cycle_investor_settlement_status
    ELSE 'profit_transferred'::cycle_investor_settlement_status
  END;

  UPDATE cycle_investor_settlements
  SET profit_resolved = true, status = v_status, updated_at = now()
  WHERE id = p_settlement_id;

  RETURN jsonb_build_object('transferred', v_amount, 'created', true);
END;
$$;

REVOKE ALL ON FUNCTION transfer_cycle_profit_atomic(UUID, UUID, NUMERIC, UUID, UUID, UUID, TEXT)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transfer_cycle_profit_atomic(UUID, UUID, NUMERIC, UUID, UUID, UUID, TEXT)
  TO service_role;

CREATE OR REPLACE FUNCTION reinvest_cycle_profit_atomic(
  p_settlement_id UUID,
  p_investor_id UUID,
  p_target_cycle_id UUID,
  p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settlement cycle_investor_settlements%ROWTYPE;
  v_wallet investor_profit_wallets%ROWTYPE;
  v_queue_id UUID;
  v_existing_amount NUMERIC(18, 2);
  v_amount NUMERIC(18, 2);
  v_status cycle_investor_settlement_status;
BEGIN
  SELECT * INTO v_settlement
  FROM cycle_investor_settlements
  WHERE id = p_settlement_id AND investor_id = p_investor_id
  FOR UPDATE;

  IF v_settlement.id IS NULL THEN RAISE EXCEPTION 'Settlement not found'; END IF;

  IF v_settlement.profit_resolved THEN
    SELECT id, amount INTO v_queue_id, v_existing_amount
    FROM investment_queue
    WHERE cycle_settlement_id = p_settlement_id AND queue_type = 'reinvestment'
    LIMIT 1;
    RETURN jsonb_build_object(
      'reinvested', COALESCE(v_existing_amount, 0),
      'queue_id', v_queue_id,
      'created', false
    );
  END IF;

  SELECT * INTO v_wallet
  FROM investor_profit_wallets
  WHERE investor_id = p_investor_id
    AND fund_id = v_settlement.fund_id
    AND source_cycle_id = v_settlement.investment_cycle_id
  FOR UPDATE;

  v_amount := round(LEAST(COALESCE(v_wallet.balance, 0), v_settlement.profit_amount), 2);
  IF v_amount <= 0 THEN RAISE EXCEPTION 'No cycle profit available to reinvest'; END IF;

  UPDATE investor_profit_wallets
  SET balance = balance - v_amount, updated_at = now()
  WHERE investor_id = p_investor_id
    AND fund_id = v_settlement.fund_id
    AND source_cycle_id = v_settlement.investment_cycle_id;

  INSERT INTO investment_queue (
    fund_id, investor_id, queue_type, amount, target_cycle_id,
    cycle_settlement_id, notes
  ) VALUES (
    v_settlement.fund_id, p_investor_id, 'reinvestment', v_amount,
    p_target_cycle_id, p_settlement_id, p_notes
  )
  RETURNING id INTO v_queue_id;

  INSERT INTO transactions (
    user_id, fund_id, type, amount, status, payment_method, notes, metadata,
    transaction_reference
  ) VALUES (
    p_investor_id, v_settlement.fund_id, 'adjustment', v_amount, 'pending',
    'profit_reinvest', p_notes,
    jsonb_build_object('settlement_id', p_settlement_id, 'target_cycle_id', p_target_cycle_id, 'queue_id', v_queue_id),
    next_transaction_reference('INV')
  );

  v_status := CASE
    WHEN v_settlement.capital_resolved OR v_settlement.principal_amount <= 0
      THEN 'closed'::cycle_investor_settlement_status
    ELSE 'profit_reinvested'::cycle_investor_settlement_status
  END;

  UPDATE cycle_investor_settlements
  SET profit_resolved = true, status = v_status, updated_at = now()
  WHERE id = p_settlement_id;

  RETURN jsonb_build_object(
    'reinvested', v_amount,
    'queue_id', v_queue_id,
    'created', true
  );
END;
$$;

REVOKE ALL ON FUNCTION reinvest_cycle_profit_atomic(UUID, UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reinvest_cycle_profit_atomic(UUID, UUID, UUID, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION process_investment_queue_item_atomic(p_item_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item investment_queue%ROWTYPE;
  v_position pool_investor_positions%ROWTYPE;
  v_delta NUMERIC(18, 2);
  v_next NUMERIC(18, 2);
BEGIN
  SELECT * INTO v_item
  FROM investment_queue
  WHERE id = p_item_id
  FOR UPDATE;

  IF v_item.id IS NULL THEN RAISE EXCEPTION 'Queue item not found'; END IF;
  IF v_item.status <> 'pending' THEN
    RETURN jsonb_build_object('processed', false);
  END IF;

  -- Serialize position and aggregate-capital changes within the same pool.
  PERFORM id FROM funds WHERE id = v_item.fund_id FOR UPDATE;

  SELECT * INTO v_position
  FROM pool_investor_positions
  WHERE fund_id = v_item.fund_id
    AND investor_id = v_item.investor_id
    AND is_virtual = false
  FOR UPDATE;

  v_delta := CASE
    WHEN v_item.queue_type = 'withdrawal' THEN -v_item.amount
    ELSE v_item.amount
  END;
  v_next := round(COALESCE(v_position.capital, 0) + v_delta, 2);

  IF v_next < 0 THEN RAISE EXCEPTION 'Insufficient pool capital for withdrawal'; END IF;

  IF v_position.id IS NULL THEN
    IF v_next <= 0 THEN RAISE EXCEPTION 'Cannot create zero-capital position'; END IF;
    INSERT INTO pool_investor_positions (
      fund_id, investor_id, is_virtual, capital
    ) VALUES (
      v_item.fund_id, v_item.investor_id, false, v_next
    );
  ELSIF v_next = 0 THEN
    DELETE FROM pool_investor_positions WHERE id = v_position.id;
  ELSE
    UPDATE pool_investor_positions
    SET capital = v_next, updated_at = now()
    WHERE id = v_position.id;
  END IF;

  UPDATE funds
  SET
    investor_capital = (
      SELECT COALESCE(SUM(capital), 0)
      FROM pool_investor_positions
      WHERE fund_id = v_item.fund_id
    ),
    updated_at = now()
  WHERE id = v_item.fund_id;

  UPDATE investment_queue
  SET status = 'processed', processed_at = now()
  WHERE id = v_item.id;

  UPDATE transactions
  SET status = 'completed', processed_at = now(), updated_at = now()
  WHERE payment_method = 'profit_reinvest'
    AND metadata->>'queue_id' = v_item.id::TEXT
    AND status = 'pending';

  RETURN jsonb_build_object('processed', true);
END;
$$;

REVOKE ALL ON FUNCTION process_investment_queue_item_atomic(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION process_investment_queue_item_atomic(UUID) TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_revenue_settlement_ledger
  ON platform_revenue_entries(profit_settlement_id, ledger_transaction_id)
  WHERE profit_settlement_id IS NOT NULL AND ledger_transaction_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cycle_profit_transfer_transaction
  ON transactions ((metadata->>'settlement_id'))
  WHERE payment_method = 'profit_transfer'
    AND status IN ('approved', 'completed')
    AND metadata->>'settlement_id' IS NOT NULL;

-- A cycle may only have one unresolved capital-return request per investor.
CREATE OR REPLACE FUNCTION request_cycle_capital_return_atomic(
  p_settlement_id UUID,
  p_investor_id UUID,
  p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settlement cycle_investor_settlements%ROWTYPE;
  v_transaction_id UUID;
BEGIN
  SELECT * INTO v_settlement
  FROM cycle_investor_settlements
  WHERE id = p_settlement_id AND investor_id = p_investor_id
  FOR UPDATE;

  IF v_settlement.id IS NULL THEN
    RAISE EXCEPTION 'Settlement not found';
  END IF;
  IF v_settlement.capital_resolved OR v_settlement.principal_amount <= 0 THEN
    RAISE EXCEPTION 'No capital available to return';
  END IF;
  IF v_settlement.status = 'capital_withdrawal_requested'
     AND v_settlement.capital_withdrawal_transaction_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'request_id', v_settlement.capital_withdrawal_transaction_id,
      'created', false
    );
  END IF;

  INSERT INTO transactions (
    user_id, fund_id, type, amount, status, payment_method, notes, metadata,
    transaction_reference
  ) VALUES (
    p_investor_id, v_settlement.fund_id, 'adjustment', v_settlement.principal_amount,
    'pending', 'cycle_capital_return', p_notes,
    jsonb_build_object('settlement_id', v_settlement.id, 'cycle_id', v_settlement.investment_cycle_id),
    next_transaction_reference('STL')
  )
  RETURNING id INTO v_transaction_id;

  UPDATE cycle_investor_settlements
  SET
    status = 'capital_withdrawal_requested',
    capital_withdrawal_transaction_id = v_transaction_id,
    updated_at = now()
  WHERE id = p_settlement_id;

  RETURN jsonb_build_object('request_id', v_transaction_id, 'created', true);
END;
$$;

REVOKE ALL ON FUNCTION request_cycle_capital_return_atomic(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION request_cycle_capital_return_atomic(UUID, UUID, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION approve_cycle_capital_return_atomic(
  p_settlement_id UUID,
  p_admin_id UUID,
  p_available_account_id UUID,
  p_suspense_account_id UUID,
  p_description TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settlement cycle_investor_settlements%ROWTYPE;
  v_transaction transactions%ROWTYPE;
  v_posting JSONB;
  v_created BOOLEAN;
  v_status cycle_investor_settlement_status;
BEGIN
  SELECT * INTO v_settlement
  FROM cycle_investor_settlements
  WHERE id = p_settlement_id
  FOR UPDATE;

  IF v_settlement.id IS NULL THEN RAISE EXCEPTION 'Settlement not found'; END IF;
  IF v_settlement.capital_resolved THEN
    RETURN jsonb_build_object(
      'amount', v_settlement.principal_amount,
      'investor_id', v_settlement.investor_id,
      'created', false
    );
  END IF;
  IF v_settlement.status <> 'capital_withdrawal_requested'
     OR v_settlement.capital_withdrawal_transaction_id IS NULL THEN
    RAISE EXCEPTION 'This capital return is not pending approval';
  END IF;

  SELECT * INTO v_transaction
  FROM transactions
  WHERE id = v_settlement.capital_withdrawal_transaction_id
  FOR UPDATE;

  IF v_transaction.id IS NULL OR v_transaction.status NOT IN ('pending', 'completed') THEN
    RAISE EXCEPTION 'Capital return transaction is not pending';
  END IF;

  v_posting := post_ledger_transaction_atomic(
    'CRT-' || replace(v_transaction.id::TEXT, '-', ''),
    p_description,
    'transfer',
    'cycle_capital_return',
    v_transaction.id,
    p_admin_id,
    jsonb_build_object('settlement_id', v_settlement.id),
    'cycle_capital_return:' || v_settlement.investor_id::TEXT || ':' || v_transaction.id::TEXT || ':funding-credit',
    jsonb_build_array(
      jsonb_build_object('accountId', p_suspense_account_id, 'entrySide', 'debit', 'amount', v_transaction.amount, 'memo', p_description),
      jsonb_build_object('accountId', p_available_account_id, 'entrySide', 'credit', 'amount', v_transaction.amount, 'memo', 'Funding wallet credit')
    )
  );
  v_created := COALESCE((v_posting->>'created')::BOOLEAN, false);

  IF v_created THEN
    UPDATE investor_portfolios
    SET available_balance = available_balance + v_transaction.amount, updated_at = now()
    WHERE user_id = v_settlement.investor_id
      AND fund_id = '00000000-0000-4000-a000-000000000001'::UUID;
  END IF;

  UPDATE transactions
  SET
    status = 'completed', processed_at = now(), processed_by = p_admin_id,
    approved_by = p_admin_id, updated_at = now()
  WHERE id = v_transaction.id;

  v_status := CASE
    WHEN v_settlement.profit_resolved OR v_settlement.profit_amount <= 0
      THEN 'closed'::cycle_investor_settlement_status
    ELSE 'capital_withdrawn'::cycle_investor_settlement_status
  END;

  UPDATE cycle_investor_settlements
  SET capital_resolved = true, status = v_status, updated_at = now()
  WHERE id = v_settlement.id;

  RETURN jsonb_build_object(
    'amount', v_transaction.amount,
    'investor_id', v_settlement.investor_id,
    'created', true
  );
END;
$$;

REVOKE ALL ON FUNCTION approve_cycle_capital_return_atomic(UUID, UUID, UUID, UUID, TEXT)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION approve_cycle_capital_return_atomic(UUID, UUID, UUID, UUID, TEXT)
  TO service_role;

-- Repair only stale presentation state with direct evidence: the cycle wallet
-- is empty and a completed profit transfer exists for that investor and pool.
UPDATE cycle_investor_settlements settlement
SET
  profit_resolved = true,
  status = CASE
    WHEN settlement.capital_resolved OR settlement.principal_amount <= 0 THEN 'closed'::cycle_investor_settlement_status
    ELSE 'profit_transferred'::cycle_investor_settlement_status
  END,
  updated_at = now()
WHERE settlement.profit_resolved = false
  AND settlement.profit_amount > 0
  AND EXISTS (
    SELECT 1
    FROM investor_profit_wallets wallet
    WHERE wallet.investor_id = settlement.investor_id
      AND wallet.fund_id = settlement.fund_id
      AND wallet.source_cycle_id = settlement.investment_cycle_id
      AND wallet.balance = 0
  )
  AND EXISTS (
    SELECT 1
    FROM transactions transaction_row
    WHERE transaction_row.user_id = settlement.investor_id
      AND transaction_row.fund_id = settlement.fund_id
      AND transaction_row.payment_method = 'profit_transfer'
      AND transaction_row.status IN ('approved', 'completed')
      AND transaction_row.created_at >= settlement.created_at
  );
