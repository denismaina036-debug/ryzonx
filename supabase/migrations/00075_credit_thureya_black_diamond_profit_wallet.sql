-- Approved correction credit to the investor's pool-profit wallet; investor transfers it normally.
DO $$
DECLARE
  v_investor UUID := '363659b5-8554-468b-bc93-0a227ca1b8da';
  v_fund UUID := '90be3bb4-d9e0-4b7f-b558-66415a2e1c9a';
  v_cycle UUID := '9a1656a2-481c-44fe-a3fa-958b4816d351';
  v_actor UUID := '0c4c099a-092c-43d1-8a95-191bba412cd7';
BEGIN
  UPDATE investor_profit_wallets SET balance = balance + 754.61, source_cycle_id = v_cycle, updated_at = now()
  WHERE investor_id = v_investor AND fund_id = v_fund;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pool profit wallet not found.'; END IF;
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_values)
  VALUES (v_actor, 'profit_wallet_settlement_correction_credited', 'investor_profit_wallet', v_investor,
    jsonb_build_object('fund_id', v_fund, 'amount', 754.61, 'reason', 'Approved Black Diamond Cycle 1 settlement shortfall correction'));
END $$;
