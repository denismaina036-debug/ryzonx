-- Reconcile the verified Johana Ngeno restart into DERIV HIGHS & LOWS.
-- The $100 wallet and ledger movement already completed successfully; only the
-- cycle allocation remained in its prior stopped state after a unique-key error.
DO $$
DECLARE
  v_investor CONSTANT UUID := '0dcb1a65-3220-4ebe-9bc0-3b130d033271';
  v_fund CONSTANT UUID := '14426b18-e139-401d-8b9e-da11321dadd7';
  v_cycle CONSTANT UUID := '6be5e622-4db4-4f15-8097-dc13ffcb6139';
  v_allocation CONSTANT UUID := '7030dd5c-87b9-4829-99de-9a8b872a6b69';
  v_transaction CONSTANT UUID := 'b4d6a4b9-2bde-47af-a7ac-8c1c829e5298';
  v_restart_at TIMESTAMPTZ;
  v_ledger_postings INTEGER;
BEGIN
  SELECT created_at INTO v_restart_at
  FROM transactions
  WHERE id = v_transaction
    AND user_id = v_investor
    AND fund_id = v_fund
    AND payment_method = 'pool_allocation'
    AND status = 'completed'
    AND amount = 100;

  SELECT COUNT(*) INTO v_ledger_postings
  FROM ledger_transactions
  WHERE source_type = 'pool_allocation'
    AND source_id = v_transaction
    AND status = 'posted';

  IF v_restart_at IS NULL OR v_ledger_postings <> 2 THEN
    RAISE EXCEPTION 'Verified $100 copy restart postings are incomplete';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM investor_portfolios
    WHERE user_id = v_investor AND fund_id = v_fund
      AND total_invested = 100 AND current_value = 100
  ) OR NOT EXISTS (
    SELECT 1 FROM pool_investor_positions
    WHERE investor_id = v_investor AND fund_id = v_fund
      AND is_virtual = false AND capital = 100
  ) THEN
    RAISE EXCEPTION 'Verified $100 copy restart balances do not match';
  END IF;

  UPDATE investment_allocations
  SET amount = 100,
      status = 'funding_confirmed',
      allocated_at = v_restart_at,
      funding_confirmed_at = v_restart_at,
      locked_at = NULL,
      settled_at = NULL,
      settlement_transaction_id = NULL,
      returned_capital_amount = 0,
      capital_returned_at = NULL,
      capital_return_ledger_transaction_id = NULL,
      cumulative_realised_return = 0,
      target_fulfilled = false,
      projected_payout = CASE
        WHEN roi_multiplier IS NOT NULL THEN ROUND(100 * roi_multiplier, 2)
        ELSE NULL
      END,
      updated_at = now()
  WHERE id = v_allocation
    AND investment_cycle_id = v_cycle
    AND investor_id = v_investor
    AND status = 'rejected'
    AND amount = 150
    AND returned_capital_amount = 150;

  IF NOT FOUND AND NOT EXISTS (
    SELECT 1 FROM investment_allocations
    WHERE id = v_allocation AND investment_cycle_id = v_cycle
      AND investor_id = v_investor AND status = 'funding_confirmed'
      AND amount = 100 AND returned_capital_amount = 0
      AND funding_confirmed_at = v_restart_at
  ) THEN
    RAISE EXCEPTION 'Copy allocation is not in the verified stopped or repaired state';
  END IF;

  UPDATE transactions
  SET metadata = COALESCE(metadata, '{}'::JSONB) || jsonb_build_object(
        'cycle_id', v_cycle,
        'allocation_id', v_allocation,
        'reconciled_after_restart', true
      ),
      updated_at = now()
  WHERE id = v_transaction;

  UPDATE investment_cycles
  SET raised_capital = COALESCE((
        SELECT ROUND(SUM(amount)::NUMERIC, 2)
        FROM investment_allocations
        WHERE investment_cycle_id = v_cycle
          AND status IN ('funding_confirmed', 'confirmed', 'locked', 'settled', 'distributed')
      ), 0),
      updated_at = now()
  WHERE id = v_cycle;

  UPDATE funds
  SET investor_capital = COALESCE((
        SELECT ROUND(SUM(capital)::NUMERIC, 2)
        FROM pool_investor_positions
        WHERE fund_id = v_fund AND is_virtual = false AND capital > 0
      ), 0),
      active_investors = COALESCE((
        SELECT COUNT(DISTINCT investor_id)
        FROM pool_investor_positions
        WHERE fund_id = v_fund AND is_virtual = false
          AND investor_id IS NOT NULL AND capital > 0
      ), 0),
      updated_at = now()
  WHERE id = v_fund;

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_values)
  VALUES (
    v_investor,
    'copy_restart_reconciled',
    'investment_allocation',
    v_allocation,
    jsonb_build_object(
      'transaction_id', v_transaction,
      'cycle_id', v_cycle,
      'amount', 100,
      'reason', 'wallet and ledger posted before stopped allocation restart failed'
    )
  );
END;
$$;
