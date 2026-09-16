-- Ownership snapshots must represent the allocations in the specific cycle.
-- Fund-level positions include capital and realised returns from other cycles and
-- must never be used as a current-cycle profit distribution basis.

DELETE FROM cycle_ownership_snapshots snapshots
USING investment_cycles cycles
WHERE snapshots.investment_cycle_id = cycles.id
  AND cycles.status = 'trading';

WITH cycle_positions AS (
  SELECT
    allocations.investment_cycle_id,
    cycles.fund_id,
    allocations.investor_id,
    ROUND(SUM(allocations.amount)::numeric, 2) AS capital
  FROM investment_allocations allocations
  JOIN investment_cycles cycles ON cycles.id = allocations.investment_cycle_id
  WHERE cycles.status = 'trading'
    AND allocations.status IN ('funding_confirmed', 'confirmed', 'settled', 'locked', 'distributed')
  GROUP BY allocations.investment_cycle_id, cycles.fund_id, allocations.investor_id
),
position_totals AS (
  SELECT
    cycle_positions.*,
    ROUND(SUM(capital) OVER (PARTITION BY investment_cycle_id)::numeric, 2) AS pool_capital_total
  FROM cycle_positions
)
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
  investment_cycle_id,
  fund_id,
  investor_id,
  false,
  NULL,
  capital,
  ROUND((capital / NULLIF(pool_capital_total, 0) * 100)::numeric, 6),
  pool_capital_total
FROM position_totals
WHERE capital > 0;
