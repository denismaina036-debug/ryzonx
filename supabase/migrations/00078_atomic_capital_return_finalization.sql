-- Capital return finalization must be a single, idempotent database transaction.
-- The historical allocation amount remains unchanged; returned_capital_amount is
-- the durable source of truth for whether any principal remains active.

ALTER TABLE investment_allocations
  ADD COLUMN IF NOT EXISTS returned_capital_amount NUMERIC(18, 2) NOT NULL DEFAULT 0
    CHECK (returned_capital_amount >= 0 AND returned_capital_amount <= amount),
  ADD COLUMN IF NOT EXISTS capital_returned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS capital_return_ledger_transaction_id UUID
    REFERENCES ledger_transactions(id) ON DELETE SET NULL;

ALTER TABLE cycle_investor_settlements
  ADD COLUMN IF NOT EXISTS capital_returned_amount NUMERIC(18, 2) NOT NULL DEFAULT 0
    CHECK (capital_returned_amount >= 0),
  ADD COLUMN IF NOT EXISTS capital_returned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS capital_return_ledger_transaction_id UUID
    REFERENCES ledger_transactions(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_allocation_capital_return_ledger
  ON investment_allocations(capital_return_ledger_transaction_id)
  WHERE capital_return_ledger_transaction_id IS NOT NULL;

COMMENT ON COLUMN investment_allocations.returned_capital_amount IS
  'Principal already returned to the investor. Returnable capital is amount minus this value.';
COMMENT ON COLUMN investment_allocations.capital_return_ledger_transaction_id IS
  'Ledger posting that finalized the capital return; provides durable idempotency evidence.';

-- Reconstruct durable return markers for capital returns completed before this migration.
UPDATE investment_allocations allocation
SET
  returned_capital_amount = LEAST(allocation.amount, settlement.principal_amount),
  capital_returned_at = COALESCE(tx.processed_at, settlement.updated_at),
  capital_return_ledger_transaction_id = ledger.id,
  updated_at = now()
FROM cycle_investor_settlements settlement
LEFT JOIN transactions tx
  ON tx.id = settlement.capital_withdrawal_transaction_id
LEFT JOIN LATERAL (
  SELECT lt.id
  FROM ledger_transactions lt
  WHERE lt.source_type = 'cycle_capital_return'
    AND lt.source_id = settlement.capital_withdrawal_transaction_id
    AND lt.status = 'posted'
  ORDER BY lt.posted_at DESC
  LIMIT 1
) ledger ON true
WHERE allocation.investment_cycle_id = settlement.investment_cycle_id
  AND allocation.investor_id = settlement.investor_id
  AND settlement.capital_resolved = true
  AND settlement.principal_amount > 0
  AND allocation.returned_capital_amount = 0;

UPDATE cycle_investor_settlements settlement
SET
  capital_returned_amount = LEAST(settlement.principal_amount, allocation.returned_capital_amount),
  capital_returned_at = COALESCE(allocation.capital_returned_at, settlement.updated_at),
  capital_return_ledger_transaction_id = allocation.capital_return_ledger_transaction_id,
  updated_at = now()
FROM investment_allocations allocation
WHERE allocation.investment_cycle_id = settlement.investment_cycle_id
  AND allocation.investor_id = settlement.investor_id
  AND settlement.capital_resolved = true
  AND settlement.capital_returned_amount = 0;

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
  v_allocation investment_allocations%ROWTYPE;
  v_cycle investment_cycles%ROWTYPE;
  v_transaction transactions%ROWTYPE;
  v_returnable NUMERIC(18, 2);
BEGIN
  SELECT * INTO v_settlement
  FROM cycle_investor_settlements
  WHERE id = p_settlement_id
  FOR UPDATE;

  IF v_settlement.id IS NULL THEN
    RAISE EXCEPTION 'Settlement not found';
  END IF;
  IF v_settlement.investor_id <> p_investor_id THEN
    RAISE EXCEPTION 'Investor does not own this settlement';
  END IF;

  SELECT * INTO v_cycle
  FROM investment_cycles
  WHERE id = v_settlement.investment_cycle_id
  FOR SHARE;

  IF v_cycle.id IS NULL OR v_cycle.fund_id IS DISTINCT FROM v_settlement.fund_id THEN
    RAISE EXCEPTION 'Investment cycle does not match settlement';
  END IF;
  IF v_cycle.status NOT IN ('completed', 'archived') THEN
    RAISE EXCEPTION 'Capital is not eligible for return until the cycle is completed';
  END IF;

  SELECT * INTO v_allocation
  FROM investment_allocations
  WHERE investment_cycle_id = v_settlement.investment_cycle_id
    AND investor_id = p_investor_id
  FOR UPDATE;

  IF v_allocation.id IS NULL THEN
    RAISE EXCEPTION 'Investment allocation not found';
  END IF;
  IF v_allocation.status IN ('pending', 'cancelled', 'rejected') THEN
    RAISE EXCEPTION 'Investment allocation is not eligible for capital return';
  END IF;

  v_returnable := ROUND(
    GREATEST(v_allocation.amount - v_allocation.returned_capital_amount, 0)::NUMERIC,
    2
  );

  IF v_settlement.capital_resolved OR v_returnable <= 0 THEN
    RAISE EXCEPTION 'No capital available to return';
  END IF;

  IF v_settlement.status = 'capital_withdrawal_requested'
     AND v_settlement.capital_withdrawal_transaction_id IS NOT NULL THEN
    SELECT * INTO v_transaction
    FROM transactions
    WHERE id = v_settlement.capital_withdrawal_transaction_id
    FOR UPDATE;

    IF v_transaction.id IS NOT NULL AND v_transaction.status = 'pending' THEN
      IF v_transaction.user_id IS DISTINCT FROM p_investor_id
         OR v_transaction.fund_id IS DISTINCT FROM v_settlement.fund_id
         OR v_transaction.payment_method IS DISTINCT FROM 'cycle_capital_return'
         OR v_transaction.amount IS DISTINCT FROM v_returnable THEN
        RAISE EXCEPTION 'Existing capital return request does not match returnable capital';
      END IF;
      RETURN jsonb_build_object(
        'request_id', v_transaction.id,
        'amount', v_returnable,
        'created', false
      );
    END IF;
  END IF;

  INSERT INTO transactions (
    user_id, fund_id, type, amount, status, payment_method, notes, metadata,
    transaction_reference
  ) VALUES (
    p_investor_id, v_settlement.fund_id, 'adjustment', v_returnable,
    'pending', 'cycle_capital_return', p_notes,
    jsonb_build_object(
      'settlement_id', v_settlement.id,
      'cycle_id', v_settlement.investment_cycle_id,
      'allocation_id', v_allocation.id,
      'returnable_amount', v_returnable
    ),
    next_transaction_reference('STL')
  )
  RETURNING * INTO v_transaction;

  UPDATE cycle_investor_settlements
  SET
    principal_amount = v_returnable,
    status = 'capital_withdrawal_requested',
    capital_withdrawal_transaction_id = v_transaction.id,
    updated_at = now()
  WHERE id = v_settlement.id;

  RETURN jsonb_build_object(
    'request_id', v_transaction.id,
    'amount', v_returnable,
    'created', true
  );
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
  v_allocation investment_allocations%ROWTYPE;
  v_cycle investment_cycles%ROWTYPE;
  v_transaction transactions%ROWTYPE;
  v_posting JSONB;
  v_ledger_transaction_id UUID;
  v_created BOOLEAN;
  v_returnable NUMERIC(18, 2);
  v_status cycle_investor_settlement_status;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'administrator'
  ) THEN
    RAISE EXCEPTION 'Administrator authorization required';
  END IF;

  SELECT * INTO v_settlement
  FROM cycle_investor_settlements
  WHERE id = p_settlement_id
  FOR UPDATE;

  IF v_settlement.id IS NULL THEN
    RAISE EXCEPTION 'Settlement not found';
  END IF;

  SELECT * INTO v_cycle
  FROM investment_cycles
  WHERE id = v_settlement.investment_cycle_id
  FOR SHARE;

  IF v_cycle.id IS NULL OR v_cycle.fund_id IS DISTINCT FROM v_settlement.fund_id THEN
    RAISE EXCEPTION 'Investment cycle does not match settlement';
  END IF;
  IF v_cycle.status NOT IN ('completed', 'archived') THEN
    RAISE EXCEPTION 'Capital is not eligible for return until the cycle is completed';
  END IF;

  SELECT * INTO v_allocation
  FROM investment_allocations
  WHERE investment_cycle_id = v_settlement.investment_cycle_id
    AND investor_id = v_settlement.investor_id
  FOR UPDATE;

  IF v_allocation.id IS NULL THEN
    RAISE EXCEPTION 'Investment allocation not found';
  END IF;
  IF v_allocation.investor_id IS DISTINCT FROM v_settlement.investor_id THEN
    RAISE EXCEPTION 'Investor does not own this investment';
  END IF;

  IF v_settlement.capital_resolved OR v_allocation.returned_capital_amount >= v_allocation.amount THEN
    IF v_allocation.returned_capital_amount < v_allocation.amount
       OR COALESCE(
         v_settlement.capital_return_ledger_transaction_id,
         v_allocation.capital_return_ledger_transaction_id
       ) IS NULL THEN
      RAISE EXCEPTION 'Capital return state is inconsistent and requires reconciliation';
    END IF;
    RETURN jsonb_build_object(
      'amount', COALESCE(NULLIF(v_settlement.capital_returned_amount, 0), v_allocation.returned_capital_amount),
      'investor_id', v_settlement.investor_id,
      'ledger_transaction_id', COALESCE(
        v_settlement.capital_return_ledger_transaction_id,
        v_allocation.capital_return_ledger_transaction_id
      ),
      'created', false
    );
  END IF;

  IF v_allocation.status IN ('pending', 'cancelled', 'rejected') THEN
    RAISE EXCEPTION 'Investment allocation is not eligible for capital return';
  END IF;
  IF v_settlement.status <> 'capital_withdrawal_requested'
     OR v_settlement.capital_withdrawal_transaction_id IS NULL THEN
    RAISE EXCEPTION 'This capital return is not pending approval';
  END IF;

  SELECT * INTO v_transaction
  FROM transactions
  WHERE id = v_settlement.capital_withdrawal_transaction_id
  FOR UPDATE;

  v_returnable := ROUND(
    GREATEST(v_allocation.amount - v_allocation.returned_capital_amount, 0)::NUMERIC,
    2
  );

  IF v_returnable <= 0 THEN
    RAISE EXCEPTION 'No capital available to return';
  END IF;
  IF v_transaction.id IS NULL
     OR v_transaction.user_id IS DISTINCT FROM v_settlement.investor_id
     OR v_transaction.fund_id IS DISTINCT FROM v_settlement.fund_id
     OR v_transaction.payment_method IS DISTINCT FROM 'cycle_capital_return'
     OR v_transaction.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Capital return transaction is not a valid pending request';
  END IF;
  IF v_transaction.amount IS DISTINCT FROM v_returnable
     OR v_settlement.principal_amount IS DISTINCT FROM v_returnable THEN
    RAISE EXCEPTION 'Capital return amount changed; reject and recreate the request';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM ledger_accounts
    WHERE id = p_available_account_id
      AND owner_type = 'investor'
      AND owner_id = v_settlement.investor_id
      AND account_type = 'liability'
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Investor available ledger account is invalid';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM ledger_accounts
    WHERE id = p_suspense_account_id
      AND owner_type = 'platform'
      AND account_type = 'asset'
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Platform suspense ledger account is invalid';
  END IF;

  v_posting := post_ledger_transaction_atomic(
    'CRT-' || replace(v_transaction.id::TEXT, '-', ''),
    p_description,
    'transfer',
    'cycle_capital_return',
    v_transaction.id,
    p_admin_id,
    jsonb_build_object(
      'settlement_id', v_settlement.id,
      'cycle_id', v_settlement.investment_cycle_id,
      'allocation_id', v_allocation.id,
      'investor_id', v_settlement.investor_id
    ),
    'cycle_capital_return:' || v_settlement.id::TEXT || ':funding-credit',
    jsonb_build_array(
      jsonb_build_object(
        'accountId', p_suspense_account_id,
        'entrySide', 'debit',
        'amount', v_returnable,
        'memo', p_description
      ),
      jsonb_build_object(
        'accountId', p_available_account_id,
        'entrySide', 'credit',
        'amount', v_returnable,
        'memo', 'Funding wallet capital return credit'
      )
    )
  );

  v_created := COALESCE((v_posting->>'created')::BOOLEAN, false);
  v_ledger_transaction_id := (v_posting->'transaction'->>'id')::UUID;

  IF NOT v_created THEN
    RAISE EXCEPTION 'Capital return ledger posting already exists without finalized investment state';
  END IF;

  -- Legacy projection update. The ledger remains authoritative; this update is in
  -- the same transaction and therefore cannot diverge from the posting.
  UPDATE investor_portfolios
  SET
    available_balance = available_balance + v_returnable,
    updated_at = now()
  WHERE user_id = v_settlement.investor_id
    AND fund_id = '00000000-0000-4000-a000-000000000001'::UUID;

  -- Retire this returned principal from the pool projection while preserving
  -- the allocation's original amount for completed-cycle history.
  UPDATE investor_portfolios
  SET
    total_invested = GREATEST(total_invested - v_returnable, 0),
    current_value = GREATEST(current_value - v_returnable, 0),
    updated_at = now()
  WHERE user_id = v_settlement.investor_id
    AND fund_id = v_settlement.fund_id;

  UPDATE investment_allocations
  SET
    returned_capital_amount = returned_capital_amount + v_returnable,
    capital_returned_at = now(),
    capital_return_ledger_transaction_id = v_ledger_transaction_id,
    updated_at = now()
  WHERE id = v_allocation.id
    AND returned_capital_amount + v_returnable <= amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Capital return could not be applied to investment allocation';
  END IF;

  UPDATE transactions
  SET
    status = 'completed',
    processed_at = now(),
    processed_by = p_admin_id,
    approved_by = p_admin_id,
    updated_at = now(),
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'ledger_transaction_id', v_ledger_transaction_id,
      'returned_capital_amount', v_returnable,
      'completed_atomically', true
    )
  WHERE id = v_transaction.id;

  v_status := CASE
    WHEN v_settlement.profit_resolved OR v_settlement.profit_amount <= 0
      THEN 'closed'::cycle_investor_settlement_status
    ELSE 'capital_withdrawn'::cycle_investor_settlement_status
  END;

  UPDATE cycle_investor_settlements
  SET
    capital_resolved = true,
    capital_returned_amount = v_allocation.returned_capital_amount + v_returnable,
    capital_returned_at = now(),
    capital_return_ledger_transaction_id = v_ledger_transaction_id,
    status = v_status,
    updated_at = now()
  WHERE id = v_settlement.id;

  INSERT INTO audit_logs (
    actor_id, action, entity_type, entity_id, old_values, new_values
  ) VALUES (
    p_admin_id,
    'cycle_capital_return_completed',
    'cycle_investor_settlement',
    v_settlement.id,
    jsonb_build_object(
      'capital_resolved', false,
      'returnable_capital', v_returnable
    ),
    jsonb_build_object(
      'capital_resolved', true,
      'returned_capital_amount', v_returnable,
      'allocation_id', v_allocation.id,
      'transaction_id', v_transaction.id,
      'ledger_transaction_id', v_ledger_transaction_id
    )
  );

  RETURN jsonb_build_object(
    'amount', v_returnable,
    'investor_id', v_settlement.investor_id,
    'allocation_id', v_allocation.id,
    'ledger_transaction_id', v_ledger_transaction_id,
    'created', true
  );
END;
$$;

REVOKE ALL ON FUNCTION approve_cycle_capital_return_atomic(UUID, UUID, UUID, UUID, TEXT)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION approve_cycle_capital_return_atomic(UUID, UUID, UUID, UUID, TEXT)
  TO service_role;
