-- Correct only journal records with an explicitly recorded final result.
-- Never infer a result from an unfinished draft/position or alter a cycle that
-- has already entered settlement. Existing payouts and legacy trades stay intact.
WITH repaired AS (
  UPDATE trade_entries entry
  SET status = 'closed',
      opened_at = COALESCE(entry.opened_at, entry.created_at),
      closed_at = COALESCE(entry.closed_at, entry.updated_at, entry.created_at)
  FROM trade_journals journal, investment_cycles cycle
  WHERE entry.journal_id = journal.id
    AND journal.investment_cycle_id = entry.investment_cycle_id
    AND journal.pool_manager_id = entry.pool_manager_id
    AND cycle.id = entry.investment_cycle_id
    AND cycle.status IN ('trading', 'distribution')
    AND entry.status = 'open'
    AND entry.exit_price IS NOT NULL
    AND entry.realized_pnl IS NOT NULL
    AND (
      (entry.trade_result = 'profit' AND entry.realized_pnl > 0)
      OR (entry.trade_result = 'loss' AND entry.realized_pnl < 0)
      OR (entry.trade_result = 'breakeven' AND entry.realized_pnl = 0)
    )
    AND entry.loss_applied_at IS NULL
    AND entry.profit_applied_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM profit_settlements settlement
      WHERE settlement.investment_cycle_id = cycle.id
    )
  RETURNING entry.id, entry.investment_cycle_id, entry.realized_pnl
)
UPDATE investment_cycles cycle
SET current_cycle_profit = (
  -- The CTE's writes are not visible to the base-table scan in this statement.
  SELECT COALESCE(SUM(result.realized_pnl), 0)
  FROM (
    SELECT entry.realized_pnl FROM trade_entries entry
    WHERE entry.investment_cycle_id = cycle.id AND entry.status = 'closed'
    UNION ALL
    SELECT repaired.realized_pnl FROM repaired
    WHERE repaired.investment_cycle_id = cycle.id
  ) result
)
WHERE cycle.id IN (SELECT investment_cycle_id FROM repaired);
