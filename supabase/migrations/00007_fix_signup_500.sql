-- =============================================================================
-- Fix signup 500 — profile-only trigger, orphan cleanup, portfolio RLS
-- =============================================================================

-- Remove orphaned profiles left from failed signups (no matching auth.users row)
DELETE FROM public.investor_portfolios ip
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = ip.user_id
);

DELETE FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = p.id
);

-- Allow authenticated users to bootstrap their own portfolio row
DROP POLICY IF EXISTS "Users can insert own portfolio" ON public.investor_portfolios;
CREATE POLICY "Users can insert own portfolio"
  ON public.investor_portfolios FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
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

  -- Drop stale rows for the same email tied to a deleted auth user
  DELETE FROM public.investor_portfolios ip
  WHERE ip.user_id IN (
    SELECT p.id
    FROM public.profiles p
    WHERE p.email = NEW.email AND p.id <> NEW.id
  );

  DELETE FROM public.profiles p
  WHERE p.email = NEW.email AND p.id <> NEW.id;

  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (NEW.id, NEW.email, v_full_name, v_phone, 'investor')
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Ensure auth trigger still points at the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;
