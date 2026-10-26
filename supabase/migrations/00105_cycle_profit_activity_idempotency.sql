-- Prevent duplicate copier-facing profit activity rows without changing the
-- authoritative profit settlement or ledger. Existing history is preserved;
-- duplicate historical projections are handled through a reviewed Batch D.

CREATE OR REPLACE FUNCTION prevent_duplicate_cycle_profit_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allocation_id TEXT;
BEGIN
  IF NEW.payment_method IS DISTINCT FROM 'cycle_profit' THEN
    RETURN NEW;
  END IF;

  v_allocation_id := NEW.metadata->>'allocationId';
  IF v_allocation_id IS NULL OR char_length(trim(v_allocation_id)) = 0 THEN
    RAISE EXCEPTION 'cycle_profit activity requires metadata.allocationId';
  END IF;

  -- Serialize inserts for the same settlement allocation. This protects the
  -- application-level existence check from concurrent dashboard requests.
  PERFORM pg_advisory_xact_lock(hashtext('cycle_profit:' || v_allocation_id));

  IF EXISTS (
    SELECT 1
    FROM transactions transaction_row
    WHERE transaction_row.payment_method = 'cycle_profit'
      AND transaction_row.metadata->>'allocationId' = v_allocation_id
  ) THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_duplicate_cycle_profit_activity_before_insert
  ON transactions;
CREATE TRIGGER prevent_duplicate_cycle_profit_activity_before_insert
  BEFORE INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_cycle_profit_activity();

REVOKE ALL ON FUNCTION prevent_duplicate_cycle_profit_activity() FROM PUBLIC;

COMMENT ON FUNCTION prevent_duplicate_cycle_profit_activity() IS
  'Serializes copier cycle-profit activity inserts by settlement allocation and skips duplicates. This affects presentation history only; it does not post ledger entries.';
