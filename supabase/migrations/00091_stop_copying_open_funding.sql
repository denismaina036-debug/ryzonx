-- Release an automatically continued copying balance before the next period trades.
-- Only the service role can call this owner-scoped, idempotent financial action.
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_copy_stop_funding_allocation
  ON transactions ((metadata->>'allocation_id'))
  WHERE payment_method = 'copy_stop_funding' AND status = 'completed';

CREATE OR REPLACE FUNCTION stop_copying_open_funding_atomic(
  p_allocation_id UUID,
  p_investor_id UUID,
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
  v_allocation investment_allocations%ROWTYPE;
  v_cycle investment_cycles%ROWTYPE;
  v_existing transactions%ROWTYPE;
  v_transaction transactions%ROWTYPE;
  v_amount NUMERIC(18, 2);
  v_posting JSONB;
  v_ledger_transaction_id UUID;
BEGIN
  SELECT * INTO v_allocation FROM investment_allocations
  WHERE id = p_allocation_id AND investor_id = p_investor_id FOR UPDATE;
  IF v_allocation.id IS NULL THEN RAISE EXCEPTION 'Copying allocation not found'; END IF;

  SELECT * INTO v_existing FROM transactions
  WHERE payment_method = 'copy_stop_funding'
    AND metadata->>'allocation_id' = p_allocation_id::TEXT
    AND status = 'completed'
  LIMIT 1;
  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object('transferred', v_existing.amount, 'created', false);
  END IF;

  SELECT * INTO v_cycle FROM investment_cycles
  WHERE id = v_allocation.investment_cycle_id FOR SHARE;
  IF v_cycle.id IS NULL OR v_cycle.status NOT IN ('approved', 'funding') THEN
    RAISE EXCEPTION 'Copying can only stop before the trader starts trading';
  END IF;
  IF v_allocation.status <> 'funding_confirmed' THEN
    RAISE EXCEPTION 'Copying balance is not available to release';
  END IF;
  v_amount := ROUND(GREATEST(v_allocation.amount - v_allocation.returned_capital_amount, 0), 2);
  IF v_amount <= 0 THEN RAISE EXCEPTION 'No copying balance is available to transfer'; END IF;

  IF NOT EXISTS (SELECT 1 FROM ledger_accounts WHERE id = p_available_account_id
    AND owner_type = 'investor' AND owner_id = p_investor_id AND account_type = 'liability' AND is_active)
    OR NOT EXISTS (SELECT 1 FROM ledger_accounts WHERE id = p_suspense_account_id
      AND owner_type = 'platform' AND account_type = 'asset' AND is_active) THEN
    RAISE EXCEPTION 'Invalid settlement accounts';
  END IF;

  INSERT INTO transactions (user_id, fund_id, type, amount, status, payment_method, notes, metadata, transaction_reference)
  VALUES (p_investor_id, v_cycle.fund_id, 'adjustment', v_amount, 'pending', 'copy_stop_funding', p_description,
    jsonb_build_object('allocation_id', v_allocation.id, 'cycle_id', v_cycle.id, 'capital_amount', v_amount),
    next_transaction_reference('STP')) RETURNING * INTO v_transaction;

  v_posting := post_ledger_transaction_atomic(
    'STP-' || replace(v_transaction.id::TEXT, '-', ''), p_description, 'transfer', 'copy_stop_funding',
    v_transaction.id, p_investor_id, jsonb_build_object('allocation_id', v_allocation.id),
    'copy-stop-funding:' || v_allocation.id::TEXT,
    jsonb_build_array(
      jsonb_build_object('accountId', p_suspense_account_id, 'entrySide', 'debit', 'amount', v_amount, 'memo', 'Copying balance released'),
      jsonb_build_object('accountId', p_available_account_id, 'entrySide', 'credit', 'amount', v_amount, 'memo', 'Copying balance transferred to Funding Wallet')
    )
  );
  v_ledger_transaction_id := (v_posting->'transaction'->>'id')::UUID;
  IF v_ledger_transaction_id IS NULL THEN RAISE EXCEPTION 'Stop-copying ledger posting failed'; END IF;

  UPDATE investment_allocations SET status = 'rejected', returned_capital_amount = amount,
    capital_returned_at = now(), capital_return_ledger_transaction_id = v_ledger_transaction_id, updated_at = now()
  WHERE id = v_allocation.id;
  UPDATE pool_investor_positions
  SET capital = GREATEST(capital - v_amount, 0), updated_at = now()
  WHERE fund_id = v_cycle.fund_id AND investor_id = p_investor_id AND is_virtual = false;
  DELETE FROM pool_investor_positions
  WHERE fund_id = v_cycle.fund_id AND investor_id = p_investor_id AND is_virtual = false AND capital = 0;
  UPDATE funds SET investor_capital = (
    SELECT COALESCE(SUM(capital), 0) FROM pool_investor_positions
    WHERE fund_id = v_cycle.fund_id AND is_virtual = false
  ), updated_at = now() WHERE id = v_cycle.fund_id;
  UPDATE investor_portfolios SET available_balance = available_balance + v_amount, updated_at = now()
  WHERE user_id = p_investor_id AND fund_id = '00000000-0000-4000-a000-000000000001'::UUID;
  UPDATE transactions SET status = 'completed', processed_at = now(), processed_by = p_investor_id,
    metadata = metadata || jsonb_build_object('ledger_transaction_id', v_ledger_transaction_id, 'completed_atomically', true)
  WHERE id = v_transaction.id;
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_values)
  VALUES (p_investor_id, 'copying_stopped_before_trading', 'investment_allocation', v_allocation.id,
    jsonb_build_object('transferred', v_amount, 'transaction_id', v_transaction.id));
  RETURN jsonb_build_object('transferred', v_amount, 'created', true);
END;
$$;

REVOKE ALL ON FUNCTION stop_copying_open_funding_atomic(UUID, UUID, UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION stop_copying_open_funding_atomic(UUID, UUID, UUID, UUID, TEXT) TO service_role;
