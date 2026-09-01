-- =============================================================================
-- Migration 081: Atomic cycle loss distribution
-- Applies a completed cycle's negative P/L to the exact cycle allocations,
-- records investor activity, and prevents losses beyond committed capital.
-- =============================================================================

-- A fully depleted allocation remains as cycle history with a zero balance.
ALTER TABLE investment_allocations
  DROP CONSTRAINT IF EXISTS investment_allocations_amount_check;

ALTER TABLE investment_allocations
  ADD CONSTRAINT investment_allocations_amount_check CHECK (amount >= 0);

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_cycle_loss_allocation
  ON transactions ((metadata->>'allocationId'))
  WHERE payment_method = 'cycle_loss'
    AND metadata ? 'allocationId';

CREATE OR REPLACE FUNCTION enforce_cycle_trade_loss_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle investment_cycles%ROWTYPE;
  v_allocation_capital NUMERIC(18, 2) := 0;
  v_initial_capital NUMERIC(18, 2) := 0;
  v_loss_capacity NUMERIC(18, 2) := 0;
  v_existing_pnl NUMERIC(18, 2) := 0;
  v_resulting_pnl NUMERIC(18, 2) := 0;
BEGIN
  IF NEW.status::text <> 'closed' OR COALESCE(NEW.realized_pnl, 0) >= 0 THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_cycle
  FROM investment_cycles
  WHERE id = NEW.investment_cycle_id
  FOR UPDATE;

  IF v_cycle.id IS NULL THEN
    RAISE EXCEPTION 'Cycle not found';
  END IF;

  SELECT ROUND(COALESCE(SUM(amount), 0)::numeric, 2)
  INTO v_allocation_capital
  FROM investment_allocations
  WHERE investment_cycle_id = NEW.investment_cycle_id
    AND status::text IN (
      'pending', 'funding_confirmed', 'confirmed', 'settled', 'locked', 'distributed'
    );

  IF jsonb_typeof(v_cycle.pool_config_snapshot->'pool'->'initialRaisedCapital') = 'number' THEN
    v_initial_capital := ROUND(
      COALESCE((v_cycle.pool_config_snapshot->'pool'->>'initialRaisedCapital')::numeric, 0),
      2
    );
  END IF;

  v_loss_capacity := CASE
    WHEN v_allocation_capital > 0 THEN v_allocation_capital
    ELSE GREATEST(v_initial_capital, COALESCE(v_cycle.raised_capital, 0))
  END;

  IF ABS(ROUND(NEW.realized_pnl::numeric, 2)) > v_loss_capacity THEN
    RAISE EXCEPTION 'A recorded loss cannot exceed the cycle''s invested capital.';
  END IF;

  SELECT ROUND(COALESCE(SUM(realized_pnl), 0)::numeric, 2)
  INTO v_existing_pnl
  FROM trade_entries
  WHERE investment_cycle_id = NEW.investment_cycle_id
    AND status::text = 'closed'
    AND id <> NEW.id;

  v_resulting_pnl := ROUND(v_existing_pnl + NEW.realized_pnl, 2);
  IF v_resulting_pnl < -v_loss_capacity THEN
    RAISE EXCEPTION 'The cycle''s total loss cannot exceed its invested capital.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trade_entries_loss_cap_guard ON trade_entries;
CREATE TRIGGER trade_entries_loss_cap_guard
  BEFORE INSERT OR UPDATE OF status, realized_pnl, investment_cycle_id
  ON trade_entries
  FOR EACH ROW
  EXECUTE FUNCTION enforce_cycle_trade_loss_cap();

REVOKE ALL ON FUNCTION enforce_cycle_trade_loss_cap() FROM PUBLIC;

CREATE OR REPLACE FUNCTION apply_cycle_loss_distribution_atomic(
  p_settlement_id UUID,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settlement profit_settlements%ROWTYPE;
  v_cycle investment_cycles%ROWTYPE;
  v_row RECORD;
  v_position pool_investor_positions%ROWTYPE;
  v_loss NUMERIC(18, 2);
  v_new_amount NUMERIC(18, 2);
  v_requested_loss NUMERIC(18, 2) := 0;
  v_loss_basis NUMERIC(18, 2) := 0;
  v_applied_loss NUMERIC(18, 2) := 0;
  v_applied_count INTEGER := 0;
  v_initial_capital NUMERIC(18, 2) := 0;
  v_cycle_allocation_total NUMERIC(18, 2) := 0;
  v_cycle_investor_count INTEGER := 0;
BEGIN
  SELECT * INTO v_settlement
  FROM profit_settlements
  WHERE id = p_settlement_id
  FOR UPDATE;

  IF v_settlement.id IS NULL THEN
    RAISE EXCEPTION 'Settlement not found';
  END IF;
  IF v_settlement.gross_trading_profit >= 0 THEN
    RAISE EXCEPTION 'This settlement does not contain a cycle loss';
  END IF;
  IF v_settlement.status::text NOT IN ('confirmed', 'distributing') THEN
    RAISE EXCEPTION 'Settlement must be confirmed before distributing losses';
  END IF;
  IF v_settlement.fund_id IS NULL THEN
    RAISE EXCEPTION 'Settlement fund is required to distribute losses';
  END IF;

  SELECT * INTO v_cycle
  FROM investment_cycles
  WHERE id = v_settlement.investment_cycle_id
  FOR UPDATE;

  IF v_cycle.id IS NULL THEN
    RAISE EXCEPTION 'Cycle not found';
  END IF;

  -- Serialize all pool-capital changes for this settlement.
  PERFORM id FROM funds WHERE id = v_settlement.fund_id FOR UPDATE;

  SELECT
    ROUND(COALESCE(SUM(ABS(profit_share)), 0)::numeric, 2),
    ROUND(COALESCE(SUM(capital_basis), 0)::numeric, 2)
  INTO v_requested_loss, v_loss_basis
  FROM profit_settlement_allocations
  WHERE profit_settlement_id = p_settlement_id
    AND profit_share < 0;

  IF v_requested_loss <= 0 THEN
    RAISE EXCEPTION 'No investor loss allocations were found';
  END IF;
  IF v_requested_loss > v_loss_basis THEN
    RAISE EXCEPTION 'The cycle''s total loss cannot exceed its invested capital.';
  END IF;

  FOR v_row IN
    SELECT
      psa.id AS settlement_allocation_id,
      psa.investor_id,
      psa.investment_allocation_id,
      psa.profit_share,
      ia.amount AS current_amount
    FROM profit_settlement_allocations psa
    JOIN investment_allocations ia ON ia.id = psa.investment_allocation_id
    WHERE psa.profit_settlement_id = p_settlement_id
      AND psa.status = 'pending'
      AND psa.profit_share < 0
    ORDER BY psa.id
    FOR UPDATE OF psa, ia
  LOOP
    v_loss := ROUND(ABS(v_row.profit_share)::numeric, 2);
    IF v_loss <= 0 THEN
      CONTINUE;
    END IF;
    IF v_loss > ROUND(v_row.current_amount::numeric, 2) THEN
      RAISE EXCEPTION 'Investor loss exceeds remaining cycle capital';
    END IF;

    v_new_amount := ROUND(v_row.current_amount::numeric - v_loss, 2);

    UPDATE investment_allocations
    SET amount = v_new_amount, updated_at = now()
    WHERE id = v_row.investment_allocation_id;

    UPDATE investor_portfolios
    SET
      total_invested = GREATEST(0, ROUND((total_invested - v_loss)::numeric, 2)),
      current_value = GREATEST(0, ROUND((current_value - v_loss)::numeric, 2)),
      realized_pnl = ROUND((realized_pnl - v_loss)::numeric, 2),
      updated_at = now()
    WHERE user_id = v_row.investor_id
      AND fund_id = v_settlement.fund_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Investor portfolio not found for cycle loss allocation';
    END IF;

    SELECT * INTO v_position
    FROM pool_investor_positions
    WHERE fund_id = v_settlement.fund_id
      AND investor_id = v_row.investor_id
      AND is_virtual = false
    FOR UPDATE;

    IF v_position.id IS NULL OR v_position.capital < v_loss THEN
      RAISE EXCEPTION 'Investor pool capital is insufficient for cycle loss allocation';
    END IF;

    IF ROUND(v_position.capital - v_loss, 2) = 0 THEN
      DELETE FROM pool_investor_positions WHERE id = v_position.id;
    ELSE
      UPDATE pool_investor_positions
      SET capital = ROUND((capital - v_loss)::numeric, 2), updated_at = now()
      WHERE id = v_position.id;
    END IF;

    INSERT INTO transactions (
      user_id,
      fund_id,
      type,
      amount,
      status,
      payment_method,
      notes,
      processed_by,
      processed_at,
      transaction_reference,
      metadata
    ) VALUES (
      v_row.investor_id,
      v_settlement.fund_id,
      'adjustment',
      v_loss,
      'completed',
      'cycle_loss',
      'Pool Loss — ' || v_cycle.name,
      p_actor_id,
      now(),
      next_transaction_reference('LSS'),
      jsonb_build_object(
        'currency', 'USD',
        'cycleId', v_cycle.id,
        'cycleName', v_cycle.name,
        'settlementId', v_settlement.id,
        'allocationId', v_row.settlement_allocation_id,
        'investmentAllocationId', v_row.investment_allocation_id,
        'lossAmount', v_loss,
        'remainingCapital', v_new_amount
      )
    );

    UPDATE profit_settlement_allocations
    SET status = 'transferred', transferred_at = now(), updated_at = now()
    WHERE id = v_row.settlement_allocation_id;

    v_applied_loss := ROUND(v_applied_loss + v_loss, 2);
    v_applied_count := v_applied_count + 1;
  END LOOP;

  IF jsonb_typeof(v_cycle.pool_config_snapshot->'pool'->'initialRaisedCapital') = 'number' THEN
    v_initial_capital := ROUND(
      COALESCE((v_cycle.pool_config_snapshot->'pool'->>'initialRaisedCapital')::numeric, 0),
      2
    );
  END IF;

  SELECT
    ROUND(COALESCE(SUM(amount), 0)::numeric, 2),
    COUNT(DISTINCT investor_id)::integer
  INTO v_cycle_allocation_total, v_cycle_investor_count
  FROM investment_allocations
  WHERE investment_cycle_id = v_cycle.id
    AND status::text IN (
      'pending', 'funding_confirmed', 'confirmed', 'settled', 'locked', 'distributed'
    );

  UPDATE investment_cycles
  SET
    raised_capital = ROUND(v_initial_capital + v_cycle_allocation_total, 2),
    investor_count = v_cycle_investor_count,
    updated_at = now()
  WHERE id = v_cycle.id;

  IF v_applied_loss > 0 THEN
    UPDATE funds
    SET
      investor_capital = (
        SELECT ROUND(COALESCE(SUM(capital), 0)::numeric, 2)
        FROM pool_investor_positions
        WHERE fund_id = v_settlement.fund_id
      ),
      current_capital = GREATEST(0, ROUND((COALESCE(current_capital, 0) - v_applied_loss)::numeric, 2)),
      pool_value = GREATEST(0, ROUND((COALESCE(pool_value, 0) - v_applied_loss)::numeric, 2)),
      updated_at = now()
    WHERE id = v_settlement.fund_id;
  END IF;

  RETURN jsonb_build_object(
    'settlementId', v_settlement.id,
    'cycleId', v_cycle.id,
    'appliedLoss', v_applied_loss,
    'investorCount', v_applied_count,
    'alreadyApplied', v_applied_count = 0
  );
END;
$$;

REVOKE ALL ON FUNCTION apply_cycle_loss_distribution_atomic(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION apply_cycle_loss_distribution_atomic(UUID, UUID) TO service_role;

COMMENT ON FUNCTION apply_cycle_loss_distribution_atomic(UUID, UUID) IS
  'Atomically applies negative settlement allocations to cycle capital and records investor Pool Loss activity.';
