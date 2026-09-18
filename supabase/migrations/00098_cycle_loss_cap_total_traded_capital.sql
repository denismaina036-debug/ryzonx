-- Validate recorded cycle losses against the full capital traded in the cycle.
-- Initial/set capital remains in the loss-cap denominator alongside copier allocations.

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

  v_loss_capacity := GREATEST(
    ROUND(COALESCE(v_cycle.raised_capital, 0)::numeric, 2),
    ROUND(v_initial_capital + v_allocation_capital, 2)
  );

  IF ABS(ROUND(NEW.realized_pnl::numeric, 2)) > v_loss_capacity THEN
    RAISE EXCEPTION 'A recorded loss cannot exceed the total capital traded in the cycle.';
  END IF;

  SELECT ROUND(COALESCE(SUM(realized_pnl), 0)::numeric, 2)
  INTO v_existing_pnl
  FROM trade_entries
  WHERE investment_cycle_id = NEW.investment_cycle_id
    AND status::text = 'closed'
    AND id <> NEW.id;

  v_resulting_pnl := ROUND(v_existing_pnl + NEW.realized_pnl, 2);
  IF v_resulting_pnl < -v_loss_capacity THEN
    RAISE EXCEPTION 'The cycle''s total loss cannot exceed the total capital traded in the cycle.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION enforce_cycle_trade_loss_cap() FROM PUBLIC;

