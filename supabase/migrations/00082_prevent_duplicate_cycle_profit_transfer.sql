-- Cycle profit wallets are the authoritative disposable-profit balance.
-- Keep the pool portfolio projection synchronized in the same transaction so
-- a completed transfer cannot be revived from a stale current_value.

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

  UPDATE investor_portfolios
  SET
    current_value = GREATEST(total_invested, current_value - v_amount),
    realized_pnl = realized_pnl - LEAST(GREATEST(realized_pnl, 0), v_amount),
    unrealized_pnl = unrealized_pnl - LEAST(
      GREATEST(unrealized_pnl, 0),
      GREATEST(v_amount - GREATEST(realized_pnl, 0), 0)
    ),
    updated_at = now()
  WHERE user_id = p_investor_id
    AND fund_id = v_settlement.fund_id;

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

-- Reverse only the two legacy fallback credits confirmed by the production
-- audit. Each duplicated a settlement-backed transfer within seconds. The
-- idempotency keys make this repair safe to retry.
DO $$
DECLARE
  v_duplicate RECORD;
  v_available_account UUID;
  v_suspense_account UUID;
  v_available_balance NUMERIC(18, 2);
  v_posting JSONB;
BEGIN
  SELECT id INTO v_suspense_account
  FROM ledger_accounts
  WHERE code = 'PLATFORM_SUSPENSE';

  IF v_suspense_account IS NULL THEN
    RAISE EXCEPTION 'Platform suspense ledger account is missing';
  END IF;

  FOR v_duplicate IN
    SELECT * FROM (VALUES
      (
        '85e9f610-b1f3-44e6-9f8d-6aa4c9d0c1a0'::UUID,
        '53c0f8b7-a5e8-402e-9c65-15185cd8a0e1'::UUID,
        '13f478f1-1d1e-449e-8a85-21f6f5535ccf'::UUID,
        39006.00::NUMERIC(18, 2)
      ),
      (
        '586fc12c-eed5-421e-98d6-484ae1eb3ff6'::UUID,
        '758483e5-171c-4417-826f-9131f8fc94c2'::UUID,
        'e6e8fc35-e0c3-4e88-8377-bab5052e1085'::UUID,
        8760.00::NUMERIC(18, 2)
      )
    ) AS duplicate_credit(duplicate_transaction_id, original_transaction_id, investor_id, amount)
  LOOP
    -- Skip environments where this production transaction does not exist and
    -- skip a repair that was already completed.
    IF NOT EXISTS (
      SELECT 1 FROM transactions
      WHERE id = v_duplicate.duplicate_transaction_id
        AND user_id = v_duplicate.investor_id
        AND payment_method = 'profit_transfer'
        AND amount = v_duplicate.amount
        AND status IN ('approved', 'completed')
        AND COALESCE((metadata->>'duplicate_profit_transfer_reversed')::BOOLEAN, false) = false
    ) THEN
      CONTINUE;
    END IF;

    SELECT id INTO v_available_account
    FROM ledger_accounts
    WHERE code = 'INVESTOR_' || upper(substr(replace(v_duplicate.investor_id::TEXT, '-', ''), 1, 12)) || '_AVAILABLE';

    IF v_available_account IS NULL THEN
      RAISE EXCEPTION 'Investor available ledger account is missing for %', v_duplicate.investor_id;
    END IF;

    SELECT round(COALESCE(SUM(
      CASE WHEN entry.entry_side = 'credit' THEN entry.amount ELSE -entry.amount END
    ), 0), 2)
    INTO v_available_balance
    FROM ledger_entries entry
    WHERE entry.account_id = v_available_account;

    IF v_available_balance < v_duplicate.amount THEN
      RAISE EXCEPTION 'Cannot safely reverse duplicate transaction %: available balance % is below %',
        v_duplicate.duplicate_transaction_id, v_available_balance, v_duplicate.amount;
    END IF;

    v_posting := post_ledger_transaction_atomic(
      'DPR-' || replace(v_duplicate.duplicate_transaction_id::TEXT, '-', ''),
      'Reverse duplicate pool profit transfer',
      'reversal',
      'transaction',
      v_duplicate.duplicate_transaction_id,
      v_duplicate.investor_id,
      jsonb_build_object(
        'duplicate_transaction_id', v_duplicate.duplicate_transaction_id,
        'original_transaction_id', v_duplicate.original_transaction_id
      ),
      'duplicate-profit-transfer-reversal:' || v_duplicate.duplicate_transaction_id::TEXT,
      jsonb_build_array(
        jsonb_build_object(
          'accountId', v_available_account,
          'entrySide', 'debit',
          'amount', v_duplicate.amount,
          'memo', 'Remove duplicate pool profit credit'
        ),
        jsonb_build_object(
          'accountId', v_suspense_account,
          'entrySide', 'credit',
          'amount', v_duplicate.amount,
          'memo', 'Reverse duplicate pool profit credit'
        )
      )
    );

    IF COALESCE((v_posting->>'created')::BOOLEAN, false) THEN
      UPDATE investor_portfolios
      SET
        available_balance = round(GREATEST(available_balance - v_duplicate.amount, 0), 2),
        updated_at = now()
      WHERE user_id = v_duplicate.investor_id
        AND fund_id = '00000000-0000-4000-a000-000000000001'::UUID;
    END IF;

    UPDATE transactions
    SET
      status = 'cancelled',
      metadata = COALESCE(metadata, '{}'::JSONB) || jsonb_build_object(
        'duplicate_profit_transfer_reversed', true,
        'original_transaction_id', v_duplicate.original_transaction_id
      ),
      admin_notes = concat_ws(
        E'\n',
        NULLIF(admin_notes, ''),
        'Duplicate cycle-profit credit reversed by migration 00082.'
      ),
      updated_at = now()
    WHERE id = v_duplicate.duplicate_transaction_id;
  END LOOP;
END;
$$;
