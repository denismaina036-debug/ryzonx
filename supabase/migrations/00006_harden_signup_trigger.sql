-- =============================================================================
-- Harden signup trigger — safe search_path, resilient portfolio bootstrap
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_phone TEXT;
  v_first TEXT;
  v_middle TEXT;
  v_last TEXT;
BEGIN
  v_first := NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), '');
  v_middle := NULLIF(TRIM(NEW.raw_user_meta_data->>'middle_name'), '');
  v_last := NULLIF(TRIM(NEW.raw_user_meta_data->>'last_name'), '');
  v_phone := NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), '');

  v_full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(CONCAT_WS(' ', v_first, v_middle, v_last)), ''),
    'Investor'
  );

  INSERT INTO profiles (id, email, full_name, phone, role)
  VALUES (NEW.id, NEW.email, v_full_name, v_phone, 'investor')
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    updated_at = now();

  BEGIN
    INSERT INTO investor_portfolios (
      user_id,
      fund_id,
      total_invested,
      current_value,
      ownership_percentage,
      unrealized_pnl,
      realized_pnl,
      total_deposits,
      total_withdrawals
    )
    VALUES (
      NEW.id,
      '00000000-0000-4000-a000-000000000001',
      0, 0, 0, 0, 0, 0, 0
    )
    ON CONFLICT (user_id, fund_id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG 'investor_portfolios bootstrap skipped for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;
