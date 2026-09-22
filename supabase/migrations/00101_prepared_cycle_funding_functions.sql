-- Teach the atomic funding selector about the explicit trader-controlled prepared state.
-- No financial rows or historical cycle states are modified by this migration.

-- Restore trader-controlled cycle sequencing without changing settlement math.
--
-- A cycle may always be prepared. Exactly one cycle per pool may accept new
-- capital, and its direct successor becomes eligible as soon as that cycle
-- starts trading. Existing draft/submitted/approved values remain supported as
-- legacy prepared states; none requires per-cycle admin approval.

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
  IF v_cycle.status NOT IN ('draft', 'submitted', 'approved', 'prepared') THEN
    RAISE EXCEPTION 'Investment cycle cannot open for funding from status %', v_cycle.status;
  END IF;

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

  IF EXISTS (
    SELECT 1
    FROM investment_cycles predecessor
    WHERE predecessor.fund_id = v_cycle.fund_id
      AND predecessor.cycle_number = v_cycle.cycle_number - 1
      AND predecessor.status NOT IN ('trading', 'distribution', 'completed', 'archived')
  ) THEN
    RAISE EXCEPTION 'The previous investment cycle must start trading before this cycle can receive capital.';
  END IF;

  UPDATE investment_cycles
  SET
    status = 'funding',
    submitted_at = COALESCE(submitted_at, v_now),
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
    jsonb_build_object('status', 'funding', 'atomic', true, 'admin_approval_required', false)
  );

  RETURN v_cycle.id;
END;
$$;

REVOKE ALL ON FUNCTION activate_investment_cycle_funding_atomic(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION activate_investment_cycle_funding_atomic(UUID, UUID) TO service_role;

CREATE OR REPLACE FUNCTION activate_next_investment_cycle_funding_atomic(
  p_fund_id UUID,
  p_actor_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle_id UUID;
BEGIN
  PERFORM id FROM funds WHERE id = p_fund_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pool not found';
  END IF;

  SELECT id INTO v_cycle_id
  FROM investment_cycles
  WHERE fund_id = p_fund_id AND status = 'funding'
  ORDER BY cycle_number
  LIMIT 1;
  IF v_cycle_id IS NOT NULL THEN
    RETURN v_cycle_id;
  END IF;

  SELECT candidate.id INTO v_cycle_id
  FROM investment_cycles candidate
  LEFT JOIN investment_cycles predecessor
    ON predecessor.fund_id = candidate.fund_id
   AND predecessor.cycle_number = candidate.cycle_number - 1
  WHERE candidate.fund_id = p_fund_id
    AND candidate.status IN ('draft', 'submitted', 'approved', 'prepared')
    AND (
      predecessor.id IS NULL
      OR predecessor.status IN ('trading', 'distribution', 'completed', 'archived')
    )
  ORDER BY candidate.cycle_number
  LIMIT 1;

  IF v_cycle_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN activate_investment_cycle_funding_atomic(v_cycle_id, p_actor_id);
END;
$$;

REVOKE ALL ON FUNCTION activate_next_investment_cycle_funding_atomic(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION activate_next_investment_cycle_funding_atomic(UUID, UUID) TO service_role;

CREATE OR REPLACE FUNCTION start_investment_cycle_trading_atomic(
  p_cycle_id UUID,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle investment_cycles%ROWTYPE;
  v_next investment_cycles%ROWTYPE;
  v_existing_funding_id UUID;
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
  IF v_cycle.status <> 'funding' THEN
    RAISE EXCEPTION 'Investment cycle cannot start trading from status %', v_cycle.status;
  END IF;

  PERFORM id FROM funds WHERE id = v_cycle.fund_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pool not found';
  END IF;

  UPDATE investment_cycles
  SET status = 'trading', trading_started_at = COALESCE(trading_started_at, v_now),
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
    jsonb_build_object('status', 'trading', 'atomic', true)
  );

  SELECT id INTO v_existing_funding_id
  FROM investment_cycles
  WHERE fund_id = v_cycle.fund_id AND status = 'funding'
  ORDER BY cycle_number
  LIMIT 1;

  IF v_existing_funding_id IS NULL THEN
    SELECT * INTO v_next
    FROM investment_cycles
    WHERE fund_id = v_cycle.fund_id
      AND cycle_number = v_cycle.cycle_number + 1
      AND status IN ('draft', 'submitted', 'approved', 'prepared')
    FOR UPDATE;

    IF v_next.id IS NOT NULL THEN
      UPDATE investment_cycles
      SET status = 'funding', submitted_at = COALESCE(submitted_at, v_now),
          funding_started_at = COALESCE(funding_started_at, v_now), updated_at = v_now
      WHERE id = v_next.id;

      INSERT INTO audit_logs (
        actor_id, action, entity_type, entity_id, old_values, new_values
      ) VALUES (
        p_actor_id,
        'investment_cycle_status_changed',
        'investment_cycle',
        v_next.id,
        jsonb_build_object('status', v_next.status),
        jsonb_build_object(
          'status', 'funding',
          'atomic', true,
          'trigger_cycle_id', v_cycle.id,
          'admin_approval_required', false
        )
      );
      v_existing_funding_id := v_next.id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'cycle_id', v_cycle.id,
    'funding_cycle_id', v_existing_funding_id
  );
END;
$$;

REVOKE ALL ON FUNCTION start_investment_cycle_trading_atomic(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION start_investment_cycle_trading_atomic(UUID, UUID) TO service_role;

