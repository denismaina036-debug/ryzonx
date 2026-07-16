-- =============================================================================
-- Deposit flow schema repair — idempotent, safe to re-run
-- Ensures crypto deposit columns, wallets table, and portfolio balance exist
-- =============================================================================

-- Crypto fields on transactions (from 00009, may be missing if migration not applied)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS crypto_symbol TEXT,
  ADD COLUMN IF NOT EXISTS crypto_network TEXT,
  ADD COLUMN IF NOT EXISTS crypto_amount NUMERIC(18, 8);

-- Admin portal transaction fields (from 00004)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_proof TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS destination TEXT;

-- Portfolio available balance for post-approval pool allocation (from 00008)
ALTER TABLE investor_portfolios
  ADD COLUMN IF NOT EXISTS available_balance NUMERIC(18, 2) NOT NULL DEFAULT 0;

-- Crypto deposit wallets table (from 00009)
CREATE TABLE IF NOT EXISTS crypto_deposit_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  network_code TEXT NOT NULL,
  network_label TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  min_deposit NUMERIC(18, 8) NOT NULL DEFAULT 20,
  icon_color TEXT NOT NULL DEFAULT '#627d98',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fund_id, symbol, network_code)
);

CREATE INDEX IF NOT EXISTS idx_crypto_wallets_fund_active
  ON crypto_deposit_wallets (fund_id, is_active, sort_order);

ALTER TABLE crypto_deposit_wallets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'crypto_deposit_wallets'
      AND policyname = 'Investors can view active crypto wallets'
  ) THEN
    CREATE POLICY "Investors can view active crypto wallets"
      ON crypto_deposit_wallets FOR SELECT
      USING (is_active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'crypto_deposit_wallets'
      AND policyname = 'Admins manage crypto wallets'
  ) THEN
    CREATE POLICY "Admins manage crypto wallets"
      ON crypto_deposit_wallets FOR ALL
      USING (get_user_role() = 'administrator');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'crypto_deposit_wallets_updated_at'
  ) THEN
    CREATE TRIGGER crypto_deposit_wallets_updated_at
      BEFORE UPDATE ON crypto_deposit_wallets
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- Seed default wallets when table is empty
INSERT INTO crypto_deposit_wallets (
  fund_id, symbol, name, network_code, network_label, wallet_address,
  min_deposit, icon_color, sort_order
)
SELECT
  v.fund_id::uuid,
  v.symbol,
  v.name,
  v.network_code,
  v.network_label,
  v.wallet_address,
  v.min_deposit::numeric,
  v.icon_color,
  v.sort_order::integer
FROM (VALUES
  ('00000000-0000-4000-a000-000000000001', 'USDT', 'Tether', 'TRC20', 'Tron (TRC20)', 'TAdminUpdateRyvonXUSDTTRC20Wallet', 20, '#10b981', 1),
  ('00000000-0000-4000-a000-000000000001', 'USDT', 'Tether', 'ERC20', 'Ethereum (ERC20)', '0xAdminUpdateRyvonXUSDTERC20Wallet', 20, '#10b981', 2),
  ('00000000-0000-4000-a000-000000000001', 'USDT', 'Tether', 'BEP20', 'BNB Smart Chain (BEP20)', '0xAdminUpdateRyvonXUSDTBEP20Wallet', 20, '#10b981', 3),
  ('00000000-0000-4000-a000-000000000001', 'USDC', 'USD Coin', 'ERC20', 'Ethereum (ERC20)', '0xAdminUpdateRyvonXUSDCERC20Wallet', 20, '#3b82f6', 4),
  ('00000000-0000-4000-a000-000000000001', 'USDC', 'USD Coin', 'BEP20', 'BNB Smart Chain (BEP20)', '0xAdminUpdateRyvonXUSDCBEP20Wallet', 20, '#3b82f6', 5),
  ('00000000-0000-4000-a000-000000000001', 'BTC', 'Bitcoin', 'BTC', 'Bitcoin Network', 'bc1AdminUpdateRyvonXBTCWallet', 0.0001, '#f59e0b', 6),
  ('00000000-0000-4000-a000-000000000001', 'ETH', 'Ethereum', 'ERC20', 'Ethereum (ERC20)', '0xAdminUpdateRyvonXETHWallet', 0.01, '#60a5fa', 7),
  ('00000000-0000-4000-a000-000000000001', 'BNB', 'BNB', 'BEP20', 'BNB Smart Chain (BEP20)', '0xAdminUpdateRyvonXBNBWallet', 0.05, '#fbbf24', 8),
  ('00000000-0000-4000-a000-000000000001', 'SOL', 'Solana', 'SOL', 'Solana Network', 'AdminUpdateRyvonXSOLWalletAddress', 0.5, '#a78bfa', 9)
) AS v(fund_id, symbol, name, network_code, network_label, wallet_address, min_deposit, icon_color, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM crypto_deposit_wallets
  WHERE fund_id = '00000000-0000-4000-a000-000000000001'
);

-- Notify PostgREST to reload schema cache after column additions
NOTIFY pgrst, 'reload schema';
