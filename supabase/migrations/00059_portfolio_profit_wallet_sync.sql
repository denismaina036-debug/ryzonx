-- =============================================================================
-- Migration 059: Portfolio current_value sync with profit wallets
-- Keeps investor_portfolios aligned with app logic after profit distributions:
-- current_value = total_invested + investor_profit_wallets.balance
-- Idempotent — safe to re-run.
-- =============================================================================

-- Ensure admin statistics JSONB exists for merged manager rating display.
ALTER TABLE pool_managers
  ADD COLUMN IF NOT EXISTS admin_statistics JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN pool_managers.admin_statistics IS
  'Admin-editable statistic overrides merged over live metrics on public surfaces.';

-- Backfill portfolio current_value for investors with credited profit wallets.
UPDATE investor_portfolios ip
SET
  current_value = ROUND((COALESCE(ip.total_invested, 0) + COALESCE(ipw.balance, 0))::numeric, 2),
  updated_at = now()
FROM investor_profit_wallets ipw
JOIN funds f ON f.id = ipw.fund_id AND f.is_default = false
WHERE ip.user_id = ipw.investor_id
  AND ip.fund_id = ipw.fund_id
  AND COALESCE(ipw.balance, 0) > 0
  AND ABS(
    ip.current_value - (COALESCE(ip.total_invested, 0) + COALESCE(ipw.balance, 0))
  ) > 0.01;

-- Create portfolio rows when profit was credited but no portfolio record exists yet.
INSERT INTO investor_portfolios (
  user_id,
  fund_id,
  total_invested,
  total_deposits,
  current_value,
  available_balance,
  realized_pnl,
  unrealized_pnl
)
SELECT
  ipw.investor_id,
  ipw.fund_id,
  COALESCE(principal.total, 0),
  COALESCE(principal.total, 0),
  ROUND((COALESCE(principal.total, 0) + COALESCE(ipw.balance, 0))::numeric, 2),
  0,
  0,
  0
FROM investor_profit_wallets ipw
JOIN funds f ON f.id = ipw.fund_id AND f.is_default = false
LEFT JOIN LATERAL (
  SELECT ROUND(COALESCE(SUM(ia.amount), 0)::numeric, 2) AS total
  FROM investment_allocations ia
  JOIN investment_cycles ic ON ic.id = ia.investment_cycle_id AND ic.fund_id = ipw.fund_id
  WHERE ia.investor_id = ipw.investor_id
    AND ia.status IN (
      'funding_confirmed',
      'confirmed',
      'settled',
      'locked',
      'distributed'
    )
) principal ON true
WHERE COALESCE(ipw.balance, 0) > 0
  AND NOT EXISTS (
    SELECT 1
    FROM investor_portfolios ip
    WHERE ip.user_id = ipw.investor_id
      AND ip.fund_id = ipw.fund_id
  );
