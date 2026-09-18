-- One pool may expose at most one cycle to new copier capital.
-- Activation is serialized per fund and moves a prepared cycle to funding in
-- one transaction. Copier continuation remains a separate financial operation.

CREATE UNIQUE INDEX IF NOT EXISTS idx_investment_cycles_one_funding_per_fund
  ON investment_cycles (fund_id)
  WHERE status = 'funding' AND fund_id IS NOT NULL;

CREATE OR REPLACE FUNCTION activate_investment_cycle_funding_atomic(
  p_cycle_id UUID,
  p_actor_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle investment_cycles%ROWTYPE;
  v_now TIMESTAMPTZ := now();
BEGIN
  SELECT * INTO v_cycle
  FROM investment_cycles
  WHERE id = p_cycle_id
  FOR UPDATE;

  IF v_cycle.id IS NULL THEN
    RAISE EXCEPTION 'Investment cycle not found';
  END IF;
  IF v_cycle.fund_id IS NULL THEN
    RAISE EXCEPTION 'Investment cycle is not linked to a pool';
  END IF;
  IF v_cycle.status = 'funding' THEN
    RETURN v_cycle.id;
  END IF;
  IF v_cycle.status NOT IN ('draft', 'submitted', 'approved', 'trading', 'distribution') THEN
    RAISE EXCEPTION 'Investment cycle cannot open for funding from status %', v_cycle.status;
  END IF;

  -- The fund lock serializes two concurrent activation requests before either
  -- request checks or changes the authoritative funding cycle.
  PERFORM id FROM funds WHERE id = v_cycle.fund_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pool not found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM investment_cycles
    WHERE fund_id = v_cycle.fund_id
      AND status = 'funding'
      AND id <> v_cycle.id
  ) THEN
    RAISE EXCEPTION 'Another investment cycle is already accepting new copiers.'
      USING ERRCODE = '23505';
  END IF;

  UPDATE investment_cycles
  SET
    status = 'funding',
    submitted_at = COALESCE(submitted_at, v_now),
    approved_at = COALESCE(approved_at, v_now),
    funding_started_at = COALESCE(funding_started_at, v_now),
    updated_at = v_now
  WHERE id = v_cycle.id;

  INSERT INTO audit_logs (
    actor_id, action, entity_type, entity_id, old_values, new_values
  ) VALUES (
    p_actor_id,
    'investment_cycle_status_changed',
    'investment_cycle',
    v_cycle.id,
    jsonb_build_object('status', v_cycle.status),
    jsonb_build_object('status', 'funding', 'atomic', true)
  );

  RETURN v_cycle.id;
END;
$$;

REVOKE ALL ON FUNCTION activate_investment_cycle_funding_atomic(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION activate_investment_cycle_funding_atomic(UUID, UUID) TO service_role;
