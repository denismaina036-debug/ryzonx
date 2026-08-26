-- Approved one-time correction: $44 already transferred; credit the $754.61 shortfall.
DO $$
DECLARE
  v_investor UUID := '363659b5-8554-468b-bc93-0a227ca1b8da';
  v_allocation UUID := '93ed0a4b-ee59-455c-ba53-403aeb5bdbe8';
  v_settlement_allocation UUID := 'e55c3289-baee-43c5-a3e0-f4736e7123e2';
  v_actor UUID := '0c4c099a-092c-43d1-8a95-191bba412cd7';
  v_fund UUID := '90be3bb4-d9e0-4b7f-b558-66415a2e1c9a';
  v_shortfall NUMERIC := 754.61;
BEGIN
  UPDATE profit_settlement_allocations SET capital_basis = 400, ownership_pct = 0.003148, profit_share = 798.61, updated_at = now()
  WHERE id = v_settlement_allocation AND profit_share = 44;
  IF NOT FOUND THEN RAISE EXCEPTION 'Expected original $44 settlement allocation was not found.'; END IF;
  UPDATE investor_portfolios SET available_balance = available_balance + v_shortfall, updated_at = now()
  WHERE user_id = v_investor AND fund_id = '00000000-0000-4000-a000-000000000001';
  INSERT INTO transactions (user_id, fund_id, type, amount, status, payment_method, notes, processed_by, processed_at)
  VALUES (v_investor, v_fund, 'adjustment', v_shortfall, 'completed', 'settlement_correction', 'Settlement correction — BLACK DIAMOND CAPITAL POOL Cycle 1; corrected $200 basis to $400.', v_actor, now());
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_values, new_values)
  VALUES (v_actor, 'profit_settlement_correction', 'profit_settlement_allocation', v_settlement_allocation,
    jsonb_build_object('capital_basis', 200, 'profit_share', 44),
    jsonb_build_object('capital_basis', 400, 'profit_share', 798.61, 'credit', v_shortfall, 'reason', 'Approved client settlement correction'));
END $$;
