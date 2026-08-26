-- Admin-only, atomic corrections for a completed deposit or a pre-trading allocation.
-- Corrections are deliberately blocked once a cycle has begun trading.

CREATE OR REPLACE FUNCTION admin_correct_investor_deposit(
  p_transaction_id UUID,
  p_amount NUMERIC,
  p_reason TEXT,
  p_actor_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction transactions%ROWTYPE;
  v_delta NUMERIC;
  v_balance NUMERIC;
BEGIN
  IF p_amount <= 0 OR length(trim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'A positive amount and a meaningful correction reason are required.';
  END IF;

  SELECT * INTO v_transaction FROM transactions WHERE id = p_transaction_id FOR UPDATE;
  IF NOT FOUND OR v_transaction.type <> 'deposit' OR v_transaction.status <> 'completed' THEN
    RAISE EXCEPTION 'Only completed deposit records can be corrected.';
  END IF;

  v_delta := round(p_amount - v_transaction.amount, 2);
  SELECT available_balance INTO v_balance
  FROM investor_portfolios
  WHERE user_id = v_transaction.user_id AND fund_id = v_transaction.fund_id
  FOR UPDATE;

  IF v_balance IS NULL OR v_balance + v_delta < 0 THEN
    RAISE EXCEPTION 'This correction would make the investor funding balance negative.';
  END IF;

  UPDATE transactions
  SET amount = p_amount, processed_by = p_actor_id, processed_at = now(), updated_at = now()
  WHERE id = p_transaction_id;

  UPDATE investor_portfolios
  SET total_deposits = total_deposits + v_delta,
      available_balance = available_balance + v_delta,
      updated_at = now()
  WHERE user_id = v_transaction.user_id AND fund_id = v_transaction.fund_id;

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_values, new_values)
  VALUES (p_actor_id, 'investor_deposit_amount_corrected', 'transactions', p_transaction_id,
    jsonb_build_object('amount', v_transaction.amount),
    jsonb_build_object('amount', p_amount, 'delta', v_delta, 'reason', trim(p_reason)));
END;
$$;

CREATE OR REPLACE FUNCTION admin_correct_investment_allocation(
  p_allocation_id UUID,
  p_amount NUMERIC,
  p_reason TEXT,
  p_actor_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allocation investment_allocations%ROWTYPE;
  v_fund_id UUID;
  v_cycle_status TEXT;
  v_delta NUMERIC;
BEGIN
  IF p_amount <= 0 OR length(trim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'A positive amount and a meaningful correction reason are required.';
  END IF;

  SELECT ia.*, ic.fund_id, ic.status::text INTO v_allocation, v_fund_id, v_cycle_status
  FROM investment_allocations ia JOIN investment_cycles ic ON ic.id = ia.investment_cycle_id
  WHERE ia.id = p_allocation_id FOR UPDATE;
  IF NOT FOUND OR v_allocation.status IN ('cancelled', 'distributed') OR EXISTS (
    SELECT 1 FROM profit_settlement_allocations
    WHERE investment_allocation_id = p_allocation_id
  ) THEN
    RAISE EXCEPTION 'An allocation can only be corrected before its first profit distribution.';
  END IF;

  v_delta := round(p_amount - v_allocation.amount, 2);
  UPDATE investment_allocations SET amount = p_amount, updated_at = now() WHERE id = p_allocation_id;
  UPDATE investor_portfolios SET total_invested = total_invested + v_delta, total_deposits = total_deposits + v_delta,
    current_value = current_value + v_delta, updated_at = now()
  WHERE user_id = v_allocation.investor_id AND fund_id = v_fund_id;
  UPDATE pool_investor_positions SET capital = capital + v_delta, updated_at = now()
  WHERE fund_id = v_fund_id AND investor_id = v_allocation.investor_id AND is_virtual = false;
  UPDATE funds SET investor_capital = investor_capital + v_delta, current_capital = current_capital + v_delta, updated_at = now() WHERE id = v_fund_id;
  UPDATE investment_cycles SET raised_capital = raised_capital + v_delta, updated_at = now() WHERE id = v_allocation.investment_cycle_id;
  UPDATE investor_portfolios ip SET ownership_percentage = CASE WHEN totals.capital > 0 THEN round((pip.capital / totals.capital) * 100, 6) ELSE 0 END, updated_at = now()
  FROM pool_investor_positions pip, (SELECT sum(capital) AS capital FROM pool_investor_positions WHERE fund_id = v_fund_id) totals
  WHERE ip.user_id = pip.investor_id AND ip.fund_id = pip.fund_id AND pip.fund_id = v_fund_id AND pip.is_virtual = false;
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_values, new_values)
  VALUES (p_actor_id, 'investor_allocation_amount_corrected', 'investment_allocations', p_allocation_id,
    jsonb_build_object('amount', v_allocation.amount), jsonb_build_object('amount', p_amount, 'delta', v_delta, 'reason', trim(p_reason)));
END;
$$;

REVOKE ALL ON FUNCTION admin_correct_investor_deposit(UUID, NUMERIC, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_correct_investment_allocation(UUID, NUMERIC, TEXT, UUID) FROM PUBLIC;
NOTIFY pgrst, 'reload schema';
