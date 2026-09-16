-- A copier may request an exit while capital is still trading. The request is
-- isolated to that copier's allocation and is settled atomically when its
-- specific cycle closes.

CREATE TABLE copy_stop_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id UUID NOT NULL UNIQUE REFERENCES investment_allocations(id) ON DELETE RESTRICT,
  investment_cycle_id UUID NOT NULL REFERENCES investment_cycles(id) ON DELETE RESTRICT,
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE RESTRICT,
  investor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  profit_account_id UUID NOT NULL REFERENCES ledger_accounts(id) ON DELETE RESTRICT,
  available_account_id UUID NOT NULL REFERENCES ledger_accounts(id) ON DELETE RESTRICT,
  suspense_account_id UUID NOT NULL REFERENCES ledger_accounts(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'completed', 'cancelled')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  transferred_amount NUMERIC(18, 2),
  capital_amount NUMERIC(18, 2),
  profit_amount NUMERIC(18, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_copy_stop_requests_cycle_status
  ON copy_stop_requests(investment_cycle_id, status);
CREATE INDEX idx_copy_stop_requests_investor_status
  ON copy_stop_requests(investor_id, status);

ALTER TABLE copy_stop_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY copy_stop_requests_owner_read ON copy_stop_requests
  FOR SELECT USING (auth.uid() = investor_id);

CREATE OR REPLACE FUNCTION validate_copy_stop_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM investment_allocations allocation
    JOIN investment_cycles cycle ON cycle.id = allocation.investment_cycle_id
    WHERE allocation.id = NEW.allocation_id
      AND allocation.investment_cycle_id = NEW.investment_cycle_id
      AND allocation.investor_id = NEW.investor_id
      AND allocation.status IN ('confirmed', 'locked', 'settled', 'distributed')
      AND allocation.amount > allocation.returned_capital_amount
      AND cycle.fund_id = NEW.fund_id
      AND cycle.status IN ('trading', 'distribution')
  ) THEN
    RAISE EXCEPTION 'Stop-copying request does not match an active owned allocation';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM ledger_accounts
    WHERE id = NEW.profit_account_id
      AND owner_type = 'investor'
      AND owner_id = NEW.investor_id
      AND account_type = 'liability'
      AND is_active = true
  ) OR NOT EXISTS (
    SELECT 1 FROM ledger_accounts
    WHERE id = NEW.available_account_id
      AND owner_type = 'investor'
      AND owner_id = NEW.investor_id
      AND account_type = 'liability'
      AND is_active = true
  ) OR NOT EXISTS (
    SELECT 1 FROM ledger_accounts
    WHERE id = NEW.suspense_account_id
      AND owner_type = 'platform'
      AND account_type = 'asset'
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Stop-copying request contains invalid ledger accounts';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION validate_copy_stop_request() FROM PUBLIC;

CREATE TRIGGER validate_copy_stop_request_before_write
  BEFORE INSERT OR UPDATE OF allocation_id, investment_cycle_id, fund_id, investor_id,
    profit_account_id, available_account_id, suspense_account_id
  ON copy_stop_requests
  FOR EACH ROW EXECUTE FUNCTION validate_copy_stop_request();

CREATE TRIGGER copy_stop_requests_updated_at
  BEFORE UPDATE ON copy_stop_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE copy_stop_requests IS
  'Owner-authorized requests to stop one copied trader after the current cycle closes.';
