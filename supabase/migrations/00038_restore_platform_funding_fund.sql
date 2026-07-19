-- =============================================================================
-- Restore platform funding wallet (DEFAULT_FUND_ID) after V1 pool data cleanup.
-- Deposits and investor_portfolios reference this fund via transactions.fund_id FK.
-- Does NOT recreate marketplace pools, strategies, or cycles.
-- =============================================================================

-- Platform-managed operator for the default funding wallet
INSERT INTO pool_managers (
  id,
  display_name,
  bio,
  status,
  is_platform_managed,
  approved_at
)
VALUES (
  '00000000-0000-4000-a000-000000000010',
  'RyvonX Trading Desk',
  'Official RyvonX platform-managed operator.',
  'approved',
  true,
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO funds (
  id,
  name,
  slug,
  description,
  status,
  is_default,
  pool_manager_id,
  lifecycle_status,
  is_marketplace_listed,
  min_investment
)
VALUES (
  '00000000-0000-4000-a000-000000000001',
  'Ryvonx Main Pool',
  'ryvonx-main-pool',
  'Platform funding wallet for investor deposits and allocations.',
  'active',
  true,
  '00000000-0000-4000-a000-000000000010',
  'live',
  false,
  100
)
ON CONFLICT (id) DO UPDATE SET
  is_default = true,
  status = 'active',
  lifecycle_status = COALESCE(funds.lifecycle_status, 'live'),
  pool_manager_id = COALESCE(funds.pool_manager_id, EXCLUDED.pool_manager_id),
  min_investment = COALESCE(funds.min_investment, EXCLUDED.min_investment);

INSERT INTO pool_stats (
  fund_id,
  total_pool_value,
  total_active_investors,
  daily_roi,
  weekly_roi,
  monthly_roi,
  total_closed_trades,
  win_rate,
  total_deposits,
  total_withdrawals
)
SELECT
  '00000000-0000-4000-a000-000000000001',
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0
WHERE NOT EXISTS (
  SELECT 1 FROM pool_stats
  WHERE fund_id = '00000000-0000-4000-a000-000000000001'
);

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

COMMENT ON TABLE funds IS
  'Canonical Pool entity. DEFAULT_FUND_ID is the platform funding wallet for deposits.';
