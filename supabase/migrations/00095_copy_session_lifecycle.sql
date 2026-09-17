-- Give every start-copy action an immutable session identity. Historical
-- stopped allocations stay immutable while one new active allocation may be
-- created for the same copier and cycle.
ALTER TABLE investment_allocations
  ADD COLUMN IF NOT EXISTS copy_session_id UUID NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_investment_allocations_copy_session
  ON investment_allocations(copy_session_id);

ALTER TABLE investment_queue
  ADD COLUMN IF NOT EXISTS copy_session_id UUID NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_investment_queue_copy_session_status
  ON investment_queue(copy_session_id, status);

-- Preserve session identity across historical automatic continuations.
DO $$
DECLARE
  v_changed INTEGER;
BEGIN
  LOOP
    UPDATE investment_allocations target
    SET copy_session_id = source.copy_session_id
    FROM transactions continuation
    JOIN cycle_investor_settlements settlement
      ON settlement.id = (continuation.metadata->>'settlement_id')::UUID
    JOIN investment_allocations source
      ON source.investment_cycle_id = settlement.investment_cycle_id
     AND source.investor_id = settlement.investor_id
    WHERE continuation.payment_method = 'copy_continue'
      AND continuation.status = 'completed'
      AND continuation.metadata->>'target_allocation_id' = target.id::TEXT
      AND target.copy_session_id IS DISTINCT FROM source.copy_session_id;
    GET DIAGNOSTICS v_changed = ROW_COUNT;
    EXIT WHEN v_changed = 0;
  END LOOP;
END;
$$;

ALTER TABLE copy_stop_requests
  ADD COLUMN IF NOT EXISTS copy_session_id UUID;

UPDATE copy_stop_requests request
SET copy_session_id = allocation.copy_session_id
FROM investment_allocations allocation
WHERE allocation.id = request.allocation_id
  AND request.copy_session_id IS NULL;

ALTER TABLE copy_stop_requests
  ALTER COLUMN copy_session_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_copy_stop_requests_session_status
  ON copy_stop_requests(copy_session_id, status);

CREATE OR REPLACE FUNCTION validate_copy_stop_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM investment_allocations allocation
    JOIN investment_cycles cycle ON cycle.id = allocation.investment_cycle_id
    WHERE allocation.id = NEW.allocation_id
      AND allocation.copy_session_id = NEW.copy_session_id
      AND allocation.investment_cycle_id = NEW.investment_cycle_id
      AND allocation.investor_id = NEW.investor_id
      AND allocation.status IN ('funding_confirmed', 'confirmed', 'locked', 'settled', 'distributed')
      AND allocation.amount > allocation.returned_capital_amount
      AND cycle.fund_id = NEW.fund_id
      AND cycle.status IN ('trading', 'distribution')
  ) THEN
    RAISE EXCEPTION 'Stop-copying request does not match an active owned copy session';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM ledger_accounts
    WHERE id = NEW.profit_account_id
      AND owner_type = 'investor' AND owner_id = NEW.investor_id
      AND account_type = 'liability' AND is_active = true
  ) OR NOT EXISTS (
    SELECT 1 FROM ledger_accounts
    WHERE id = NEW.available_account_id
      AND owner_type = 'investor' AND owner_id = NEW.investor_id
      AND account_type = 'liability' AND is_active = true
  ) OR NOT EXISTS (
    SELECT 1 FROM ledger_accounts
    WHERE id = NEW.suspense_account_id
      AND owner_type = 'platform' AND account_type = 'asset' AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Stop-copying request contains invalid ledger accounts';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION validate_copy_stop_request() FROM PUBLIC;

CREATE OR REPLACE FUNCTION attach_copy_session_transaction_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
BEGIN
  IF NEW.metadata->>'allocation_id' IS NULL THEN RETURN NEW; END IF;
  SELECT copy_session_id INTO v_session_id
  FROM investment_allocations
  WHERE id = (NEW.metadata->>'allocation_id')::UUID;
  IF v_session_id IS NOT NULL THEN
    NEW.metadata := COALESCE(NEW.metadata, '{}'::JSONB)
      || jsonb_build_object('copy_session_id', v_session_id);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION attach_copy_session_transaction_metadata() FROM PUBLIC;

DROP TRIGGER IF EXISTS attach_copy_session_transaction_metadata_before_write ON transactions;
CREATE TRIGGER attach_copy_session_transaction_metadata_before_write
  BEFORE INSERT OR UPDATE OF metadata ON transactions
  FOR EACH ROW EXECUTE FUNCTION attach_copy_session_transaction_metadata();

ALTER TABLE investment_allocations
  DROP CONSTRAINT IF EXISTS investment_allocations_investor_cycle_unique;

-- Migration 00094 repaired one posted restart by reusing its stopped allocation
-- because the old uniqueness constraint left no safe way to insert a new row.
-- Split that verified restart now so the stopped $150 session remains immutable
-- history and the posted $100 restart becomes its own active relationship.
DO $$
DECLARE
  v_old_allocation CONSTANT UUID := '7030dd5c-87b9-4829-99de-9a8b872a6b69';
  v_restart_transaction CONSTANT UUID := 'b4d6a4b9-2bde-47af-a7ac-8c1c829e5298';
  v_current investment_allocations%ROWTYPE;
  v_new_allocation_id UUID;
  v_new_session_id UUID := gen_random_uuid();
  v_stop_transaction transactions%ROWTYPE;
  v_initial_transaction transactions%ROWTYPE;
BEGIN
  SELECT * INTO v_current
  FROM investment_allocations
  WHERE id = v_old_allocation
    AND status = 'funding_confirmed'
    AND amount = 100
    AND returned_capital_amount = 0
  FOR UPDATE;

  IF v_current.id IS NULL THEN RETURN; END IF;

  SELECT * INTO v_stop_transaction
  FROM transactions
  WHERE payment_method IN ('copy_stop', 'copy_stop_funding')
    AND status = 'completed'
    AND metadata->>'allocation_id' = v_old_allocation::TEXT
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT * INTO v_initial_transaction
  FROM transactions
  WHERE payment_method = 'pool_allocation'
    AND status = 'completed'
    AND metadata->>'allocation_id' = v_old_allocation::TEXT
    AND id <> v_restart_transaction
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_stop_transaction.id IS NULL
     OR ROUND(COALESCE((v_stop_transaction.metadata->>'capital_amount')::NUMERIC, 0), 2) <> 150
     OR NOT EXISTS (
       SELECT 1 FROM transactions
       WHERE id = v_restart_transaction
         AND status = 'completed'
         AND payment_method = 'pool_allocation'
         AND amount = 100
         AND metadata->>'allocation_id' = v_old_allocation::TEXT
     ) THEN
    RAISE EXCEPTION 'Verified stopped-copy restart is not in the expected state';
  END IF;

  UPDATE investment_allocations
  SET amount = 150,
      status = 'rejected',
      allocated_at = COALESCE(v_initial_transaction.created_at, allocated_at),
      funding_confirmed_at = COALESCE(v_initial_transaction.created_at, funding_confirmed_at),
      returned_capital_amount = 150,
      capital_returned_at = COALESCE(v_stop_transaction.processed_at, v_stop_transaction.created_at),
      capital_return_ledger_transaction_id = (v_stop_transaction.metadata->>'ledger_transaction_id')::UUID,
      projected_payout = CASE
        WHEN roi_multiplier IS NOT NULL THEN ROUND(150 * roi_multiplier, 2)
        ELSE NULL
      END,
      updated_at = now()
  WHERE id = v_old_allocation;

  INSERT INTO investment_allocations (
    investment_cycle_id, investor_id, amount, currency, status,
    reference_number, allocated_at, funding_confirmed_at, investment_level_id,
    roi_multiplier, projected_payout, copy_session_id, created_at, updated_at
  ) VALUES (
    v_current.investment_cycle_id, v_current.investor_id, v_current.amount,
    v_current.currency, v_current.status, next_transaction_reference('ALC'),
    (SELECT created_at FROM transactions WHERE id = v_restart_transaction),
    (SELECT created_at FROM transactions WHERE id = v_restart_transaction),
    v_current.investment_level_id, v_current.roi_multiplier,
    v_current.projected_payout, v_new_session_id,
    (SELECT created_at FROM transactions WHERE id = v_restart_transaction), now()
  ) RETURNING id INTO v_new_allocation_id;

  UPDATE transactions
  SET metadata = metadata || jsonb_build_object(
        'allocation_id', v_new_allocation_id,
        'copy_session_id', v_new_session_id,
        'prior_stopped_allocation_id', v_old_allocation
      ),
      updated_at = now()
  WHERE id = v_restart_transaction;

  UPDATE transactions
  SET metadata = metadata || jsonb_build_object(
        'copy_session_id', v_current.copy_session_id
      ),
      updated_at = now()
  WHERE id = v_stop_transaction.id;

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_values)
  VALUES (
    v_current.investor_id,
    'copy_restart_split_into_new_session',
    'investment_allocation',
    v_new_allocation_id,
    jsonb_build_object(
      'stopped_allocation_id', v_old_allocation,
      'restart_transaction_id', v_restart_transaction,
      'copy_session_id', v_new_session_id,
      'amount', v_current.amount
    )
  );
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_investment_allocations_one_active_per_cycle
  ON investment_allocations(investment_cycle_id, investor_id)
  WHERE status NOT IN ('cancelled', 'rejected');

-- Copy-trading exit: one owner-authorized action releases realized profit and
-- completed-cycle capital. Existing settlement math remains authoritative.

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_copy_stop_settlement
  ON transactions ((metadata->>'settlement_id'))
  WHERE payment_method = 'copy_stop'
    AND status = 'completed'
    AND metadata->>'settlement_id' IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_copy_continue_target
  ON transactions ((metadata->>'settlement_id'), (metadata->>'target_cycle_id'))
  WHERE payment_method = 'copy_continue'
    AND status = 'completed'
    AND metadata->>'settlement_id' IS NOT NULL
    AND metadata->>'target_cycle_id' IS NOT NULL;

CREATE OR REPLACE FUNCTION continue_copying_atomic(
  p_settlement_id UUID,
  p_target_cycle_id UUID,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settlement cycle_investor_settlements%ROWTYPE;
  v_source investment_allocations%ROWTYPE;
  v_target investment_allocations%ROWTYPE;
  v_source_cycle investment_cycles%ROWTYPE;
  v_cycle investment_cycles%ROWTYPE;
  v_wallet investor_profit_wallets%ROWTYPE;
  v_position pool_investor_positions%ROWTYPE;
  v_existing transactions%ROWTYPE;
  v_principal NUMERIC(18, 2) := 0;
  v_profit NUMERIC(18, 2) := 0;
  v_total NUMERIC(18, 2) := 0;
BEGIN
  SELECT * INTO v_settlement
  FROM cycle_investor_settlements
  WHERE id = p_settlement_id
  FOR UPDATE;

  IF v_settlement.id IS NULL THEN RAISE EXCEPTION 'Settlement not found'; END IF;

  SELECT * INTO v_existing
  FROM transactions
  WHERE user_id = v_settlement.investor_id
    AND payment_method = 'copy_continue'
    AND metadata->>'settlement_id' = p_settlement_id::TEXT
    AND metadata->>'target_cycle_id' = p_target_cycle_id::TEXT
    AND status = 'completed'
  LIMIT 1;
  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'continued', v_existing.amount,
      'allocation_id', v_existing.metadata->>'target_allocation_id',
      'copy_session_id', v_existing.metadata->>'copy_session_id',
      'created', false
    );
  END IF;

  IF v_settlement.status = 'closed' THEN
    RAISE EXCEPTION 'Copying balance has already been resolved';
  END IF;
  IF v_settlement.status = 'capital_withdrawal_requested' THEN
    RAISE EXCEPTION 'Copying has a pending stop request';
  END IF;

  SELECT * INTO v_source_cycle
  FROM investment_cycles
  WHERE id = v_settlement.investment_cycle_id
  FOR SHARE;
  IF v_source_cycle.id IS NULL
    OR v_source_cycle.fund_id IS DISTINCT FROM v_settlement.fund_id
    OR v_source_cycle.status NOT IN ('completed', 'archived') THEN
    RAISE EXCEPTION 'Source copy period is not completed';
  END IF;

  SELECT * INTO v_cycle
  FROM investment_cycles
  WHERE id = p_target_cycle_id
  FOR SHARE;
  IF v_cycle.id IS NULL OR v_cycle.fund_id IS DISTINCT FROM v_settlement.fund_id THEN
    RAISE EXCEPTION 'Target copy period does not match settlement';
  END IF;
  IF v_cycle.status NOT IN ('approved', 'funding') THEN
    RAISE EXCEPTION 'Target copy period is not accepting copied balances';
  END IF;

  SELECT * INTO v_source
  FROM investment_allocations
  WHERE investment_cycle_id = v_settlement.investment_cycle_id
    AND investor_id = v_settlement.investor_id
    AND status IN ('funding_confirmed', 'confirmed', 'locked', 'settled', 'distributed')
    AND amount > returned_capital_amount
  ORDER BY allocated_at DESC
  LIMIT 1
  FOR UPDATE;
  IF v_source.id IS NULL THEN RAISE EXCEPTION 'Source copy allocation not found'; END IF;

  IF NOT v_settlement.capital_resolved THEN
    v_principal := ROUND(
      LEAST(
        v_settlement.principal_amount,
        GREATEST(v_source.amount - v_source.returned_capital_amount, 0)
      )::NUMERIC,
      2
    );
  END IF;

  IF NOT v_settlement.profit_resolved AND v_settlement.profit_amount > 0 THEN
    SELECT * INTO v_wallet
    FROM investor_profit_wallets
    WHERE investor_id = v_settlement.investor_id
      AND fund_id = v_settlement.fund_id
      AND source_cycle_id = v_settlement.investment_cycle_id
    FOR UPDATE;
    v_profit := ROUND(LEAST(COALESCE(v_wallet.balance, 0), v_settlement.profit_amount), 2);
  END IF;

  v_total := ROUND(v_principal + v_profit, 2);
  IF v_total <= 0 THEN RAISE EXCEPTION 'No copying balance is available to continue'; END IF;

  SELECT * INTO v_target
  FROM investment_allocations
  WHERE investment_cycle_id = p_target_cycle_id
    AND investor_id = v_settlement.investor_id
    AND copy_session_id = v_source.copy_session_id
    AND status IN ('pending', 'funding_confirmed', 'confirmed', 'locked', 'settled', 'distributed')
  ORDER BY allocated_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_target.id IS NULL THEN
    INSERT INTO investment_allocations (
      investment_cycle_id, investor_id, amount, currency, status,
      reference_number, funding_confirmed_at, investment_level_id,
      roi_multiplier, projected_payout, copy_session_id
    ) VALUES (
      p_target_cycle_id,
      v_settlement.investor_id,
      v_total,
      v_source.currency,
      'funding_confirmed',
      next_transaction_reference('CPY'),
      now(),
      v_source.investment_level_id,
      v_source.roi_multiplier,
      CASE
        WHEN v_source.roi_multiplier IS NOT NULL THEN ROUND(v_total * v_source.roi_multiplier, 2)
        ELSE NULL
      END,
      v_source.copy_session_id
    )
    RETURNING * INTO v_target;
  ELSE
    UPDATE investment_allocations
    SET
      amount = amount + v_total,
      status = 'funding_confirmed',
      funding_confirmed_at = COALESCE(funding_confirmed_at, now()),
      projected_payout = CASE
        WHEN roi_multiplier IS NOT NULL THEN ROUND((amount + v_total) * roi_multiplier, 2)
        ELSE projected_payout
      END,
      updated_at = now()
    WHERE id = v_target.id
    RETURNING * INTO v_target;
  END IF;

  IF v_profit > 0 THEN
    UPDATE investor_profit_wallets
    SET balance = balance - v_profit, updated_at = now()
    WHERE id = v_wallet.id AND balance >= v_profit;
    IF NOT FOUND THEN RAISE EXCEPTION 'Copying profit balance changed; retry continuation'; END IF;
  END IF;

  PERFORM id FROM funds WHERE id = v_settlement.fund_id FOR UPDATE;
  SELECT * INTO v_position
  FROM pool_investor_positions
  WHERE fund_id = v_settlement.fund_id
    AND investor_id = v_settlement.investor_id
    AND is_virtual = false
  FOR UPDATE;

  IF v_position.id IS NULL THEN
    INSERT INTO pool_investor_positions (fund_id, investor_id, is_virtual, capital)
    VALUES (v_settlement.fund_id, v_settlement.investor_id, false, v_total);
  ELSE
    UPDATE pool_investor_positions
    SET capital = capital + v_total, updated_at = now()
    WHERE id = v_position.id;
  END IF;

  UPDATE funds
  SET
    investor_capital = (
      SELECT COALESCE(SUM(capital), 0)
      FROM pool_investor_positions
      WHERE fund_id = v_settlement.fund_id AND is_virtual = false
    ),
    updated_at = now()
  WHERE id = v_settlement.fund_id;

  UPDATE investor_portfolios
  SET
    total_invested = total_invested + v_profit,
    -- Settlement already included the profit wallet in current_value. Moving
    -- that profit into copied capital changes its classification, not value.
    current_value = GREATEST(current_value, total_invested + v_profit),
    updated_at = now()
  WHERE user_id = v_settlement.investor_id
    AND fund_id = v_settlement.fund_id;

  UPDATE cycle_investor_settlements
  SET profit_resolved = true, capital_resolved = true, status = 'closed', updated_at = now()
  WHERE id = v_settlement.id;

  INSERT INTO transactions (
    user_id, fund_id, type, amount, status, payment_method, notes, metadata,
    transaction_reference
  ) VALUES (
    v_settlement.investor_id,
    v_settlement.fund_id,
    'adjustment',
    v_total,
    'completed',
    'copy_continue',
    'Copying balance continued automatically',
    jsonb_build_object(
      'settlement_id', v_settlement.id,
      'source_cycle_id', v_settlement.investment_cycle_id,
      'target_cycle_id', p_target_cycle_id,
      'target_allocation_id', v_target.id,
      'copy_session_id', v_source.copy_session_id,
      'capital_amount', v_principal,
      'profit_amount', v_profit
    ),
    next_transaction_reference('CPY')
  );

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_values, new_values)
  VALUES (
    p_actor_id,
    'copying_continued_automatically',
    'cycle_investor_settlement',
    v_settlement.id,
    jsonb_build_object(
      'profit_resolved', v_settlement.profit_resolved,
      'capital_resolved', v_settlement.capital_resolved
    ),
    jsonb_build_object(
      'target_cycle_id', p_target_cycle_id,
      'target_allocation_id', v_target.id,
      'capital_amount', v_principal,
      'profit_amount', v_profit
    )
  );

  RETURN jsonb_build_object(
    'continued', v_total,
    'capital', v_principal,
    'profit', v_profit,
    'allocation_id', v_target.id,
    'copy_session_id', v_source.copy_session_id,
    'created', true
  );
END;
$$;

REVOKE ALL ON FUNCTION continue_copying_atomic(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION continue_copying_atomic(UUID, UUID, UUID) TO service_role;

CREATE OR REPLACE FUNCTION stop_copying_atomic(
  p_settlement_id UUID,
  p_investor_id UUID,
  p_profit_account_id UUID,
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
  v_cycle investment_cycles%ROWTYPE;
  v_allocation investment_allocations%ROWTYPE;
  v_profit_wallet investor_profit_wallets%ROWTYPE;
  v_existing transactions%ROWTYPE;
  v_transaction transactions%ROWTYPE;
  v_profit NUMERIC(18, 2) := 0;
  v_capital NUMERIC(18, 2) := 0;
  v_total NUMERIC(18, 2) := 0;
  v_entries JSONB := '[]'::JSONB;
  v_posting JSONB;
  v_ledger_transaction_id UUID;
BEGIN
  SELECT * INTO v_settlement
  FROM cycle_investor_settlements
  WHERE id = p_settlement_id
    AND investor_id = p_investor_id
  FOR UPDATE;

  IF v_settlement.id IS NULL THEN
    RAISE EXCEPTION 'Settlement not found';
  END IF;

  SELECT * INTO v_existing
  FROM transactions
  WHERE user_id = p_investor_id
    AND payment_method = 'copy_stop'
    AND metadata->>'settlement_id' = p_settlement_id::TEXT
    AND status = 'completed'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'transferred', v_existing.amount,
      'capital', COALESCE((v_existing.metadata->>'capital_amount')::NUMERIC, 0),
      'profit', COALESCE((v_existing.metadata->>'profit_amount')::NUMERIC, 0),
      'created', false
    );
  END IF;

  SELECT * INTO v_cycle
  FROM investment_cycles
  WHERE id = v_settlement.investment_cycle_id
  FOR SHARE;

  IF v_cycle.id IS NULL OR v_cycle.fund_id IS DISTINCT FROM v_settlement.fund_id THEN
    RAISE EXCEPTION 'Copy period does not match settlement';
  END IF;
  IF v_cycle.status NOT IN ('completed', 'archived') THEN
    RAISE EXCEPTION 'Copying can stop after the current trading period is completed';
  END IF;

  SELECT * INTO v_allocation
  FROM investment_allocations
  WHERE investment_cycle_id = v_settlement.investment_cycle_id
    AND investor_id = p_investor_id
    AND status IN ('funding_confirmed', 'confirmed', 'locked', 'settled', 'distributed')
    AND amount > returned_capital_amount
  ORDER BY allocated_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_allocation.id IS NULL THEN
    RAISE EXCEPTION 'Copy allocation not found';
  END IF;
  IF v_allocation.status IN ('pending', 'cancelled', 'rejected') THEN
    RAISE EXCEPTION 'Copy allocation is not eligible to stop';
  END IF;

  IF NOT v_settlement.capital_resolved THEN
    v_capital := ROUND(
      GREATEST(v_allocation.amount - v_allocation.returned_capital_amount, 0)::NUMERIC,
      2
    );
  END IF;

  IF NOT v_settlement.profit_resolved AND v_settlement.profit_amount > 0 THEN
    SELECT * INTO v_profit_wallet
    FROM investor_profit_wallets
    WHERE investor_id = p_investor_id
      AND fund_id = v_settlement.fund_id
      AND source_cycle_id = v_settlement.investment_cycle_id
    FOR UPDATE;

    v_profit := ROUND(
      LEAST(COALESCE(v_profit_wallet.balance, 0), v_settlement.profit_amount),
      2
    );
  END IF;

  v_total := ROUND(v_capital + v_profit, 2);
  IF v_total <= 0 THEN
    RAISE EXCEPTION 'No copying balance is available to transfer';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM ledger_accounts
    WHERE id = p_available_account_id
      AND owner_type = 'investor'
      AND owner_id = p_investor_id
      AND account_type = 'liability'
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Investor available ledger account is invalid';
  END IF;

  IF v_capital > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM ledger_accounts
      WHERE id = p_suspense_account_id
        AND owner_type = 'platform'
        AND account_type = 'asset'
        AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Platform settlement account is invalid';
    END IF;
    v_entries := v_entries || jsonb_build_array(jsonb_build_object(
      'accountId', p_suspense_account_id,
      'entrySide', 'debit',
      'amount', v_capital,
      'memo', 'Copying capital released'
    ));
  END IF;

  IF v_profit > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM ledger_accounts
      WHERE id = p_profit_account_id
        AND owner_type = 'investor'
        AND owner_id = p_investor_id
        AND account_type = 'liability'
        AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Investor profit ledger account is invalid';
    END IF;
    v_entries := v_entries || jsonb_build_array(jsonb_build_object(
      'accountId', p_profit_account_id,
      'entrySide', 'debit',
      'amount', v_profit,
      'memo', 'Realized copied-trade result released'
    ));
  END IF;

  v_entries := v_entries || jsonb_build_array(jsonb_build_object(
    'accountId', p_available_account_id,
    'entrySide', 'credit',
    'amount', v_total,
    'memo', 'Copying balance transferred to Funding Wallet'
  ));

  INSERT INTO transactions (
    user_id, fund_id, type, amount, status, payment_method, notes, metadata,
    transaction_reference
  ) VALUES (
    p_investor_id, v_settlement.fund_id, 'adjustment', v_total, 'pending',
    'copy_stop', p_description,
    jsonb_build_object(
      'settlement_id', v_settlement.id,
      'cycle_id', v_settlement.investment_cycle_id,
      'allocation_id', v_allocation.id,
      'copy_session_id', v_allocation.copy_session_id,
      'capital_amount', v_capital,
      'profit_amount', v_profit
    ),
    next_transaction_reference('STP')
  )
  RETURNING * INTO v_transaction;

  v_posting := post_ledger_transaction_atomic(
    'STP-' || replace(v_transaction.id::TEXT, '-', ''),
    p_description,
    'transfer',
    'copy_stop',
    v_transaction.id,
    p_investor_id,
    jsonb_build_object(
      'settlement_id', v_settlement.id,
      'cycle_id', v_settlement.investment_cycle_id,
      'investor_id', p_investor_id
    ),
    'copy-stop:' || v_settlement.id::TEXT,
    v_entries
  );

  v_ledger_transaction_id := (v_posting->'transaction'->>'id')::UUID;
  IF v_ledger_transaction_id IS NULL THEN
    RAISE EXCEPTION 'Stop-copying ledger posting failed';
  END IF;

  IF v_profit > 0 THEN
    UPDATE investor_profit_wallets
    SET balance = balance - v_profit, updated_at = now()
    WHERE id = v_profit_wallet.id
      AND balance >= v_profit;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Copying profit balance changed; retry the request';
    END IF;
  END IF;

  IF v_capital > 0 THEN
    UPDATE investment_allocations
    SET
      returned_capital_amount = returned_capital_amount + v_capital,
      capital_returned_at = now(),
      capital_return_ledger_transaction_id = v_ledger_transaction_id,
      updated_at = now()
    WHERE id = v_allocation.id
      AND returned_capital_amount + v_capital <= amount;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Copying capital changed; retry the request';
    END IF;
  END IF;

  UPDATE investor_portfolios
  SET available_balance = available_balance + v_total, updated_at = now()
  WHERE user_id = p_investor_id
    AND fund_id = '00000000-0000-4000-a000-000000000001'::UUID;

  UPDATE investor_portfolios
  SET
    total_invested = GREATEST(total_invested - v_capital, 0),
    current_value = GREATEST(current_value - v_total, 0),
    realized_pnl = realized_pnl - LEAST(GREATEST(realized_pnl, 0), v_profit),
    unrealized_pnl = unrealized_pnl - LEAST(
      GREATEST(unrealized_pnl, 0),
      GREATEST(v_profit - GREATEST(realized_pnl, 0), 0)
    ),
    updated_at = now()
  WHERE user_id = p_investor_id
    AND fund_id = v_settlement.fund_id;

  UPDATE cycle_investor_settlements
  SET
    profit_resolved = true,
    capital_resolved = true,
    capital_returned_amount = capital_returned_amount + v_capital,
    capital_returned_at = CASE WHEN v_capital > 0 THEN now() ELSE capital_returned_at END,
    capital_return_ledger_transaction_id = CASE
      WHEN v_capital > 0 THEN v_ledger_transaction_id
      ELSE capital_return_ledger_transaction_id
    END,
    status = 'closed',
    updated_at = now()
  WHERE id = v_settlement.id;

  UPDATE transactions
  SET status = 'cancelled', updated_at = now()
  WHERE id = v_settlement.capital_withdrawal_transaction_id
    AND status = 'pending';

  UPDATE transactions
  SET
    status = 'completed',
    processed_at = now(),
    processed_by = p_investor_id,
    updated_at = now(),
    metadata = metadata || jsonb_build_object(
      'ledger_transaction_id', v_ledger_transaction_id,
      'completed_atomically', true
    )
  WHERE id = v_transaction.id;

  INSERT INTO audit_logs (
    actor_id, action, entity_type, entity_id, old_values, new_values
  ) VALUES (
    p_investor_id,
    'copying_stopped',
    'cycle_investor_settlement',
    v_settlement.id,
    jsonb_build_object(
      'profit_resolved', v_settlement.profit_resolved,
      'capital_resolved', v_settlement.capital_resolved
    ),
    jsonb_build_object(
      'profit_resolved', true,
      'capital_resolved', true,
      'capital_amount', v_capital,
      'profit_amount', v_profit,
      'transaction_id', v_transaction.id,
      'ledger_transaction_id', v_ledger_transaction_id
    )
  );

  RETURN jsonb_build_object(
    'transferred', v_total,
    'capital', v_capital,
    'profit', v_profit,
    'created', true
  );
END;
$$;

REVOKE ALL ON FUNCTION stop_copying_atomic(UUID, UUID, UUID, UUID, UUID, TEXT)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION stop_copying_atomic(UUID, UUID, UUID, UUID, UUID, TEXT)
  TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_copy_stop_queue
  ON transactions ((metadata->>'queue_id'))
  WHERE payment_method = 'copy_stop_queue' AND status = 'completed';

CREATE OR REPLACE FUNCTION stop_queued_copying_atomic(
  p_queue_id UUID,
  p_investor_id UUID,
  p_available_account_id UUID,
  p_reserved_account_id UUID,
  p_description TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item investment_queue%ROWTYPE;
  v_existing transactions%ROWTYPE;
  v_transaction transactions%ROWTYPE;
  v_posting JSONB;
  v_ledger_transaction_id UUID;
BEGIN
  SELECT * INTO v_item
  FROM investment_queue
  WHERE id = p_queue_id AND investor_id = p_investor_id
  FOR UPDATE;
  IF v_item.id IS NULL THEN RAISE EXCEPTION 'Queued copy session not found'; END IF;

  SELECT * INTO v_existing
  FROM transactions
  WHERE user_id = p_investor_id
    AND payment_method = 'copy_stop_queue'
    AND metadata->>'queue_id' = p_queue_id::TEXT
    AND status = 'completed'
  LIMIT 1;
  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'transferred', v_existing.amount,
      'copy_session_id', v_item.copy_session_id,
      'created', false
    );
  END IF;

  IF v_item.status <> 'pending' OR v_item.queue_type <> 'investment' THEN
    RAISE EXCEPTION 'Queued copying capital is not available to release';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM ledger_accounts
    WHERE id = p_available_account_id AND owner_type = 'investor'
      AND owner_id = p_investor_id AND account_type = 'liability' AND is_active
  ) OR NOT EXISTS (
    SELECT 1 FROM ledger_accounts
    WHERE id = p_reserved_account_id AND owner_type = 'investor'
      AND owner_id = p_investor_id AND account_type = 'liability' AND is_active
  ) THEN
    RAISE EXCEPTION 'Invalid queued-copy ledger accounts';
  END IF;

  INSERT INTO transactions (
    user_id, fund_id, type, amount, status, payment_method, notes, metadata,
    transaction_reference
  ) VALUES (
    p_investor_id, v_item.fund_id, 'adjustment', v_item.amount, 'pending',
    'copy_stop_queue', p_description,
    jsonb_build_object(
      'queue_id', v_item.id,
      'copy_session_id', v_item.copy_session_id,
      'capital_amount', v_item.amount
    ),
    next_transaction_reference('STP')
  ) RETURNING * INTO v_transaction;

  v_posting := post_ledger_transaction_atomic(
    'STQ-' || replace(v_transaction.id::TEXT, '-', ''),
    p_description,
    'transfer',
    'copy_stop_queue',
    v_transaction.id,
    p_investor_id,
    jsonb_build_object('queue_id', v_item.id, 'copy_session_id', v_item.copy_session_id),
    'copy-stop-queue:' || v_item.id::TEXT,
    jsonb_build_array(
      jsonb_build_object(
        'accountId', p_reserved_account_id,
        'entrySide', 'debit',
        'amount', v_item.amount,
        'memo', 'Queued copying capital released'
      ),
      jsonb_build_object(
        'accountId', p_available_account_id,
        'entrySide', 'credit',
        'amount', v_item.amount,
        'memo', 'Queued copying capital returned to Funding Wallet'
      )
    )
  );
  v_ledger_transaction_id := (v_posting->'transaction'->>'id')::UUID;
  IF v_ledger_transaction_id IS NULL THEN
    RAISE EXCEPTION 'Queued stop-copying ledger posting failed';
  END IF;

  UPDATE investment_queue
  SET status = 'cancelled', processed_at = now()
  WHERE id = v_item.id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Queued copy session changed; retry'; END IF;

  UPDATE investor_portfolios
  SET available_balance = available_balance + v_item.amount, updated_at = now()
  WHERE user_id = p_investor_id
    AND fund_id = '00000000-0000-4000-a000-000000000001'::UUID;

  UPDATE investor_portfolios
  SET total_invested = GREATEST(total_invested - v_item.amount, 0),
      current_value = GREATEST(current_value - v_item.amount, 0),
      updated_at = now()
  WHERE user_id = p_investor_id AND fund_id = v_item.fund_id;

  UPDATE transactions
  SET status = 'cancelled', updated_at = now(),
      metadata = COALESCE(metadata, '{}'::JSONB)
        || jsonb_build_object('stopped_at', now())
  WHERE user_id = p_investor_id
    AND payment_method = 'pool_allocation'
    AND metadata->>'queue_id' = v_item.id::TEXT
    AND status = 'pending';

  UPDATE transactions
  SET status = 'completed', processed_at = now(), processed_by = p_investor_id,
      updated_at = now(),
      metadata = metadata || jsonb_build_object(
        'ledger_transaction_id', v_ledger_transaction_id,
        'completed_atomically', true
      )
  WHERE id = v_transaction.id;

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_values)
  VALUES (
    p_investor_id,
    'queued_copying_stopped',
    'investment_queue',
    v_item.id,
    jsonb_build_object(
      'copy_session_id', v_item.copy_session_id,
      'transferred', v_item.amount,
      'transaction_id', v_transaction.id,
      'ledger_transaction_id', v_ledger_transaction_id
    )
  );

  RETURN jsonb_build_object(
    'transferred', v_item.amount,
    'copy_session_id', v_item.copy_session_id,
    'created', true
  );
END;
$$;

REVOKE ALL ON FUNCTION stop_queued_copying_atomic(UUID, UUID, UUID, UUID, TEXT)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION stop_queued_copying_atomic(UUID, UUID, UUID, UUID, TEXT)
  TO service_role;
