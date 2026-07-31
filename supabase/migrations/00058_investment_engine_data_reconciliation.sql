-- =============================================================================
-- Migration 058: Investment Engine Data Reconciliation
-- Aligns existing accounts with the RyvonX pool-capital / cycle-profit / profit-wallet model.
-- Idempotent — safe to re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. True principal per investor (deposits + profit reinvestments, not trade PnL)
-- -----------------------------------------------------------------------------
CREATE TEMP TABLE _engine_principal AS
SELECT
  ip.fund_id,
  ip.user_id AS investor_id,
  ROUND(
    GREATEST(
      COALESCE(NULLIF(ip.total_deposits, 0), 0)
        + COALESCE(reinvest.reinvested, 0),
      COALESCE(alloc_tx.allocated, 0),
      COALESCE(NULLIF(ip.total_deposits, 0), ip.total_invested, 0)
        - COALESCE(trade_adj.net_trade_inflation, 0)
    )::numeric,
    2
  ) AS principal
FROM investor_portfolios ip
JOIN funds f ON f.id = ip.fund_id
LEFT JOIN (
  SELECT user_id, fund_id, ROUND(SUM(amount)::numeric, 2) AS allocated
  FROM transactions
  WHERE payment_method = 'pool_allocation'
    AND status IN ('completed', 'pending')
    AND fund_id IS NOT NULL
  GROUP BY user_id, fund_id
) alloc_tx ON alloc_tx.user_id = ip.user_id AND alloc_tx.fund_id = ip.fund_id
LEFT JOIN (
  SELECT user_id, fund_id, ROUND(SUM(amount)::numeric, 2) AS reinvested
  FROM transactions
  WHERE payment_method = 'profit_reinvest'
    AND status = 'completed'
    AND fund_id IS NOT NULL
  GROUP BY user_id, fund_id
) reinvest ON reinvest.user_id = ip.user_id AND reinvest.fund_id = ip.fund_id
LEFT JOIN (
  SELECT
    ip2.fund_id,
    ip2.user_id,
    ROUND(
      (
        COALESCE(SUM(tpa.profit_amount), 0) - COALESCE(SUM(tla.loss_amount), 0)
      )::numeric,
      2
    ) AS net_trade_inflation
  FROM investor_portfolios ip2
  JOIN investment_allocations ia ON ia.investor_id = ip2.user_id
  JOIN investment_cycles ic ON ic.id = ia.investment_cycle_id AND ic.fund_id = ip2.fund_id
  LEFT JOIN trade_profit_allocations tpa ON tpa.investment_allocation_id = ia.id
  LEFT JOIN trade_loss_allocations tla ON tla.investment_allocation_id = ia.id
  GROUP BY ip2.fund_id, ip2.user_id
) trade_adj ON trade_adj.fund_id = ip.fund_id AND trade_adj.user_id = ip.user_id
WHERE f.is_default = false
  AND (
    ip.total_invested > 0
    OR ip.total_deposits > 0
    OR COALESCE(alloc_tx.allocated, 0) > 0
  );

-- Remove zero-principal rows
DELETE FROM _engine_principal WHERE principal <= 0;

-- -----------------------------------------------------------------------------
-- 2. Canonical pool capital positions
-- -----------------------------------------------------------------------------
UPDATE pool_investor_positions pip
SET capital = ep.principal,
    updated_at = now()
FROM _engine_principal ep
WHERE pip.fund_id = ep.fund_id
  AND pip.investor_id = ep.investor_id
  AND pip.is_virtual = false
  AND ABS(pip.capital - ep.principal) > 0.01;

INSERT INTO pool_investor_positions (fund_id, investor_id, is_virtual, capital)
SELECT ep.fund_id, ep.investor_id, false, ep.principal
FROM _engine_principal ep
WHERE NOT EXISTS (
  SELECT 1 FROM pool_investor_positions pip
  WHERE pip.fund_id = ep.fund_id
    AND pip.investor_id = ep.investor_id
    AND pip.is_virtual = false
);

-- Remove stale positions with no principal
DELETE FROM pool_investor_positions pip
WHERE pip.is_virtual = false
  AND pip.capital > 0
  AND NOT EXISTS (
    SELECT 1 FROM _engine_principal ep
    WHERE ep.fund_id = pip.fund_id AND ep.investor_id = pip.investor_id
  );

-- -----------------------------------------------------------------------------
-- 3. Restore cycle allocation amounts (remove per-trade capital inflation)
-- -----------------------------------------------------------------------------
WITH allocation_adjustments AS (
  SELECT
    ia.id,
    COALESCE(SUM(tpa.profit_amount), 0) AS profit_inflated,
    COALESCE(SUM(tla.loss_amount), 0) AS loss_deflated
  FROM investment_allocations ia
  LEFT JOIN trade_profit_allocations tpa ON tpa.investment_allocation_id = ia.id
  LEFT JOIN trade_loss_allocations tla ON tla.investment_allocation_id = ia.id
  GROUP BY ia.id
)
UPDATE investment_allocations ia
SET amount = GREATEST(
      0,
      ROUND((ia.amount - aa.profit_inflated + aa.loss_deflated)::numeric, 2)
    ),
    updated_at = now()
FROM allocation_adjustments aa
WHERE ia.id = aa.id
  AND (aa.profit_inflated > 0 OR aa.loss_deflated > 0);

-- -----------------------------------------------------------------------------
-- 4. Profit wallets from completed settlements (minus already transferred out)
-- -----------------------------------------------------------------------------
INSERT INTO investor_profit_wallets (investor_id, fund_id, balance)
SELECT
  psa.investor_id,
  ps.fund_id,
  ROUND(SUM(psa.profit_share)::numeric, 2)
FROM profit_settlement_allocations psa
JOIN profit_settlements ps ON ps.id = psa.profit_settlement_id
WHERE psa.status = 'transferred'
  AND psa.profit_share > 0
  AND ps.fund_id IS NOT NULL
GROUP BY psa.investor_id, ps.fund_id
ON CONFLICT (investor_id, fund_id) DO UPDATE
SET balance = GREATEST(investor_profit_wallets.balance, EXCLUDED.balance),
    updated_at = now();

UPDATE investor_profit_wallets ipw
SET balance = GREATEST(
      0,
      ROUND((ipw.balance - COALESCE(xferred.transferred, 0))::numeric, 2)
    ),
    updated_at = now()
FROM (
  SELECT user_id, fund_id, ROUND(SUM(amount)::numeric, 2) AS transferred
  FROM transactions
  WHERE payment_method = 'profit_transfer'
    AND status = 'completed'
    AND fund_id IS NOT NULL
  GROUP BY user_id, fund_id
) xferred
WHERE ipw.investor_id = xferred.user_id
  AND ipw.fund_id = xferred.fund_id
  AND COALESCE(xferred.transferred, 0) > 0;

-- Legacy portfolio realized_pnl → profit wallet when no settlement row exists yet
INSERT INTO investor_profit_wallets (investor_id, fund_id, balance)
SELECT
  ip.user_id,
  ip.fund_id,
  ROUND(GREATEST(ip.realized_pnl, 0)::numeric, 2)
FROM investor_portfolios ip
JOIN funds f ON f.id = ip.fund_id
WHERE f.is_default = false
  AND ip.realized_pnl > 0
  AND NOT EXISTS (
    SELECT 1 FROM investor_profit_wallets ipw
    WHERE ipw.investor_id = ip.user_id AND ipw.fund_id = ip.fund_id
  )
ON CONFLICT (investor_id, fund_id) DO UPDATE
SET balance = GREATEST(
      investor_profit_wallets.balance,
      EXCLUDED.balance
    ),
    updated_at = now()
WHERE investor_profit_wallets.balance = 0;

-- -----------------------------------------------------------------------------
-- 5. Reset investor portfolios — pool capital separate from profit wallet
-- -----------------------------------------------------------------------------
UPDATE investor_portfolios ip
SET
  total_invested = sub.principal,
  total_deposits = CASE
    WHEN ip.total_deposits > 0 THEN ip.total_deposits
    ELSE sub.principal
  END,
  current_value = ROUND((sub.principal + sub.wallet_balance)::numeric, 2),
  realized_pnl = 0,
  unrealized_pnl = 0,
  updated_at = now()
FROM (
  SELECT
    ip2.user_id,
    ip2.fund_id,
    COALESCE(ep.principal, 0) AS principal,
    COALESCE(ipw.balance, 0) AS wallet_balance
  FROM investor_portfolios ip2
  JOIN funds f ON f.id = ip2.fund_id AND f.is_default = false
  LEFT JOIN _engine_principal ep ON ep.fund_id = ip2.fund_id AND ep.investor_id = ip2.user_id
  LEFT JOIN investor_profit_wallets ipw
    ON ipw.fund_id = ip2.fund_id AND ipw.investor_id = ip2.user_id
  WHERE ip2.total_invested > 0
    OR ip2.total_deposits > 0
    OR COALESCE(ep.principal, 0) > 0
) sub
WHERE ip.user_id = sub.user_id
  AND ip.fund_id = sub.fund_id;

-- -----------------------------------------------------------------------------
-- 6. Sync fund-level capital totals
-- -----------------------------------------------------------------------------
UPDATE funds f
SET
  investor_capital = COALESCE(pos.total, 0),
  current_capital = COALESCE(pos.total, 0),
  active_investors = COALESCE(pos.cnt, 0),
  updated_at = now()
FROM (
  SELECT
    fund_id,
    ROUND(SUM(capital)::numeric, 2) AS total,
    COUNT(*) FILTER (WHERE NOT is_virtual AND capital > 0) AS cnt
  FROM pool_investor_positions
  GROUP BY fund_id
) pos
WHERE f.id = pos.fund_id
  AND f.is_default = false;

-- -----------------------------------------------------------------------------
-- 7. Recalculate cached cycle profit from journal (single source of truth)
-- -----------------------------------------------------------------------------
UPDATE investment_cycles ic
SET current_cycle_profit = COALESCE(trade_totals.net_pnl, 0),
    updated_at = now()
FROM (
  SELECT
    investment_cycle_id,
    ROUND(COALESCE(SUM(realized_pnl), 0)::numeric, 2) AS net_pnl
  FROM trade_entries
  WHERE status = 'closed'
  GROUP BY investment_cycle_id
) trade_totals
WHERE ic.id = trade_totals.investment_cycle_id
  AND ABS(ic.current_cycle_profit - COALESCE(trade_totals.net_pnl, 0)) > 0.01;

UPDATE investment_cycles ic
SET current_cycle_profit = 0,
    updated_at = now()
WHERE NOT EXISTS (
  SELECT 1 FROM trade_entries te
  WHERE te.investment_cycle_id = ic.id AND te.status = 'closed'
)
AND ic.current_cycle_profit <> 0;

-- -----------------------------------------------------------------------------
-- 8. Recalculate cycle raised capital from restored allocations
-- -----------------------------------------------------------------------------
UPDATE investment_cycles ic
SET
  raised_capital = COALESCE(alloc.raised, 0),
  investor_count = COALESCE(alloc.investors, 0),
  updated_at = now()
FROM (
  SELECT
    ia.investment_cycle_id,
    ROUND(SUM(ia.amount)::numeric, 2) AS raised,
    COUNT(DISTINCT ia.investor_id) AS investors
  FROM investment_allocations ia
  WHERE ia.status IN (
    'pending', 'funding_confirmed', 'confirmed', 'settled', 'locked', 'distributed'
  )
  GROUP BY ia.investment_cycle_id
) alloc
WHERE ic.id = alloc.investment_cycle_id;

-- -----------------------------------------------------------------------------
-- 9. Ownership snapshots for active/historical trading cycles missing them
-- -----------------------------------------------------------------------------
INSERT INTO cycle_ownership_snapshots (
  investment_cycle_id,
  fund_id,
  investor_id,
  is_virtual,
  virtual_label,
  capital,
  ownership_pct,
  pool_capital_total
)
SELECT
  ic.id,
  ic.fund_id,
  pip.investor_id,
  pip.is_virtual,
  pip.virtual_label,
  pip.capital,
  CASE
    WHEN totals.pool_total > 0 THEN ROUND((pip.capital / totals.pool_total * 100)::numeric, 6)
    ELSE 0
  END,
  totals.pool_total
FROM investment_cycles ic
JOIN (
  SELECT fund_id, ROUND(SUM(capital)::numeric, 2) AS pool_total
  FROM pool_investor_positions
  GROUP BY fund_id
) totals ON totals.fund_id = ic.fund_id
JOIN pool_investor_positions pip ON pip.fund_id = ic.fund_id
WHERE ic.fund_id IS NOT NULL
  AND ic.status IN ('trading', 'distribution', 'completed')
  AND totals.pool_total > 0
  AND NOT EXISTS (
    SELECT 1 FROM cycle_ownership_snapshots cos
    WHERE cos.investment_cycle_id = ic.id
  );

-- -----------------------------------------------------------------------------
-- 10. Audit log marker
-- -----------------------------------------------------------------------------
COMMENT ON TABLE pool_investor_positions IS
  'Canonical pool-level investor capital. Reconciled by migration 058. Ownership = capital / sum(capital).';

DROP TABLE IF EXISTS _engine_principal;
