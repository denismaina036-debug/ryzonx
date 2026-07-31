-- Investment engine data audit (read-only)

-- 1. Pool capital: positions vs portfolios vs funds.investor_capital
WITH position_totals AS (
  SELECT fund_id, ROUND(SUM(capital)::numeric, 2) AS pool_capital
  FROM pool_investor_positions
  WHERE is_virtual = false
  GROUP BY fund_id
),
portfolio_totals AS (
  SELECT fund_id, ROUND(SUM(total_invested)::numeric, 2) AS portfolio_invested
  FROM investor_portfolios
  WHERE total_invested > 0
  GROUP BY fund_id
)
SELECT f.id, f.name, f.status,
  ROUND(f.investor_capital::numeric, 2) AS fund_investor_capital,
  COALESCE(pt.pool_capital, 0) AS positions_total,
  COALESCE(pft.portfolio_invested, 0) AS portfolios_total,
  ROUND(f.investor_capital::numeric, 2) - COALESCE(pt.pool_capital, 0) AS fund_vs_positions,
  COALESCE(pt.pool_capital, 0) - COALESCE(pft.portfolio_invested, 0) AS positions_vs_portfolios
FROM funds f
LEFT JOIN position_totals pt ON pt.fund_id = f.id
LEFT JOIN portfolio_totals pft ON pft.fund_id = f.id
WHERE f.is_default = false
  AND (
    ABS(COALESCE(f.investor_capital, 0) - COALESCE(pt.pool_capital, 0)) > 0.01
    OR ABS(COALESCE(pt.pool_capital, 0) - COALESCE(pft.portfolio_invested, 0)) > 0.01
    OR COALESCE(pt.pool_capital, 0) > 0
    OR COALESCE(pft.portfolio_invested, 0) > 0
  )
ORDER BY f.name;

-- 2. Per-investor position vs portfolio mismatches
SELECT ip.user_id, ip.fund_id, f.name,
  ROUND(ip.total_invested::numeric, 2) AS portfolio_invested,
  ROUND(COALESCE(pip.capital, 0)::numeric, 2) AS position_capital,
  ROUND(ip.total_invested::numeric, 2) - ROUND(COALESCE(pip.capital, 0)::numeric, 2) AS delta
FROM investor_portfolios ip
JOIN funds f ON f.id = ip.fund_id
LEFT JOIN pool_investor_positions pip
  ON pip.fund_id = ip.fund_id AND pip.investor_id = ip.user_id AND pip.is_virtual = false
WHERE ip.total_invested > 0
  AND f.is_default = false
  AND ABS(ip.total_invested - COALESCE(pip.capital, 0)) > 0.01
ORDER BY ABS(ip.total_invested - COALESCE(pip.capital, 0)) DESC
LIMIT 50;

-- 3. Cycle profit: cached vs journal sum
SELECT ic.id, ic.name, ic.status,
  ROUND(ic.current_cycle_profit::numeric, 2) AS cached_profit,
  ROUND(COALESCE(SUM(te.realized_pnl), 0)::numeric, 2) AS journal_sum,
  ROUND(ic.current_cycle_profit::numeric, 2) - ROUND(COALESCE(SUM(te.realized_pnl), 0)::numeric, 2) AS delta
FROM investment_cycles ic
LEFT JOIN trade_entries te ON te.investment_cycle_id = ic.id AND te.status = 'closed'
GROUP BY ic.id, ic.name, ic.status, ic.current_cycle_profit
HAVING ABS(ic.current_cycle_profit - COALESCE(SUM(te.realized_pnl), 0)) > 0.01
   OR ic.status IN ('trading', 'distribution', 'completed')
ORDER BY ic.created_at DESC
LIMIT 30;

-- 4. Legacy per-trade capital mutations (should be reconciled)
SELECT COUNT(*) AS trades_with_profit_applied FROM trade_entries WHERE profit_applied_at IS NOT NULL;
SELECT COUNT(*) AS trades_with_loss_applied FROM trade_entries WHERE loss_applied_at IS NOT NULL;
SELECT COUNT(*) AS trade_profit_allocation_rows FROM trade_profit_allocations;
SELECT COALESCE(SUM(profit_amount), 0) AS total_per_trade_profit_credited FROM trade_profit_allocations;

-- 5. Active trading cycles missing ownership snapshots
SELECT ic.id, ic.name, ic.status, ic.fund_id
FROM investment_cycles ic
WHERE ic.status IN ('trading', 'distribution', 'completed')
  AND ic.fund_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM cycle_ownership_snapshots cos WHERE cos.investment_cycle_id = ic.id
  );

-- 6. Profit wallets vs legacy portfolio realized_pnl vs settlements
SELECT ip.user_id, ip.fund_id, f.name,
  ROUND(COALESCE(ipw.balance, 0)::numeric, 2) AS profit_wallet,
  ROUND(GREATEST(ip.realized_pnl, 0)::numeric, 2) AS portfolio_realized_pnl,
  ROUND(GREATEST(ip.current_value - ip.total_invested, 0)::numeric, 2) AS portfolio_unrealized_gain
FROM investor_portfolios ip
JOIN funds f ON f.id = ip.fund_id
LEFT JOIN investor_profit_wallets ipw ON ipw.investor_id = ip.user_id AND ipw.fund_id = ip.fund_id
WHERE f.is_default = false
  AND (ip.total_invested > 0 OR COALESCE(ipw.balance, 0) > 0 OR ip.realized_pnl > 0)
ORDER BY ip.total_invested DESC
LIMIT 30;

-- 7. Settlements transferred but profit wallet empty
SELECT psa.investor_id, ps.fund_id, f.name,
  SUM(psa.profit_share) AS total_settled,
  COALESCE(ipw.balance, 0) AS wallet_balance
FROM profit_settlement_allocations psa
JOIN profit_settlements ps ON ps.id = psa.profit_settlement_id
JOIN funds f ON f.id = ps.fund_id
LEFT JOIN investor_profit_wallets ipw ON ipw.investor_id = psa.investor_id AND ipw.fund_id = ps.fund_id
WHERE psa.status = 'transferred' AND psa.profit_share > 0
GROUP BY psa.investor_id, ps.fund_id, f.name, ipw.balance
HAVING COALESCE(ipw.balance, 0) = 0
LIMIT 30;
