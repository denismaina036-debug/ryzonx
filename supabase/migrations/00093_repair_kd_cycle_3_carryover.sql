-- Repair the verified live K-D Cycle 2 -> Cycle 3 carryover missed because
-- funding_confirmed allocations were excluded from settlement preparation.
DO $$
DECLARE
  v_source_cycle CONSTANT UUID := '8e6ac463-d73c-47ee-b4d6-4d7e30adf4be';
  v_target_cycle CONSTANT UUID := 'c9b6e870-f127-4997-8cd6-45ae95f51e60';
  v_fund CONSTANT UUID := '8db158f0-a2b2-477d-86ca-0f76eb74128a';
  v_actor UUID;
  v_row RECORD;
  v_settlement_id UUID;
BEGIN
  SELECT manager.user_id INTO v_actor
  FROM investment_cycles cycle
  JOIN pool_managers manager ON manager.id = cycle.pool_manager_id
  WHERE cycle.id = v_target_cycle AND cycle.fund_id = v_fund
    AND cycle.status IN ('approved', 'funding');
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'K-D Cycle 3 is not an eligible funding period';
  END IF;

  FOR v_row IN
    SELECT allocation.*,
      COALESCE((
        SELECT SUM(profit.profit_share)
        FROM profit_settlement_allocations profit
        JOIN profit_settlements settlement ON settlement.id = profit.profit_settlement_id
        WHERE settlement.investment_cycle_id = v_source_cycle
          AND settlement.status = 'completed'
          AND profit.investor_id = allocation.investor_id
          AND profit.status = 'transferred'
      ), 0) AS profit_amount
    FROM investment_allocations allocation
    WHERE allocation.investment_cycle_id = v_source_cycle
      AND allocation.status IN ('funding_confirmed', 'confirmed', 'locked', 'settled', 'distributed')
      AND allocation.amount > allocation.returned_capital_amount
      AND NOT EXISTS (
        SELECT 1 FROM copy_stop_requests stop
        WHERE stop.investment_cycle_id = v_source_cycle
          AND stop.investor_id = allocation.investor_id
          AND stop.status = 'requested'
      )
  LOOP
    INSERT INTO cycle_investor_settlements (
      investment_cycle_id, fund_id, investor_id, principal_amount, profit_amount,
      status, profit_resolved, capital_resolved
    ) VALUES (
      v_source_cycle, v_fund, v_row.investor_id,
      ROUND((v_row.amount - v_row.returned_capital_amount)::NUMERIC, 2),
      ROUND(v_row.profit_amount::NUMERIC, 2), 'pending_choice',
      v_row.profit_amount <= 0, false
    )
    ON CONFLICT (investment_cycle_id, investor_id) DO NOTHING
    RETURNING id INTO v_settlement_id;

    IF v_settlement_id IS NOT NULL THEN
      UPDATE pool_investor_positions
      SET capital = GREATEST(capital - (v_row.amount - v_row.returned_capital_amount), 0),
          updated_at = now()
      WHERE fund_id = v_fund AND investor_id = v_row.investor_id AND is_virtual = false;

      PERFORM continue_copying_atomic(v_settlement_id, v_target_cycle, v_actor);
    END IF;
    v_settlement_id := NULL;
  END LOOP;

  UPDATE investment_cycles
  SET raised_capital = COALESCE((
    SELECT ROUND(SUM(amount)::NUMERIC, 2) FROM investment_allocations
    WHERE investment_cycle_id = v_target_cycle
      AND status IN ('funding_confirmed', 'confirmed', 'locked', 'settled', 'distributed')
  ), 0), updated_at = now()
  WHERE id = v_target_cycle;
END;
$$;
