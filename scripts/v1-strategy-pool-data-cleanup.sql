-- =============================================================================
-- RyvonX V1.0 — Strategy & Pool Data Cleanup (DATA ONLY — no schema changes)
-- Removes all Strategies, Pools (funds), Investment Cycles, and dependent records.
-- Preserves: users, profiles, pool_managers, platform_settings, wallets (investor),
--            PM applications, auth, permissions, audit logs, rating config.
-- =============================================================================

BEGIN;

CREATE TEMP TABLE IF NOT EXISTS _v1_cleanup_counts (
  metric TEXT PRIMARY KEY,
  removed BIGINT NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION _v1_count(label TEXT, n BIGINT) RETURNS void AS $$
BEGIN
  INSERT INTO _v1_cleanup_counts (metric, removed)
  VALUES (label, n)
  ON CONFLICT (metric) DO UPDATE SET removed = EXCLUDED.removed;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  n BIGINT;
BEGIN
  RAISE NOTICE '=== RyvonX V1.0 Strategy & Pool Data Cleanup ===';

  -- -------------------------------------------------------------------------
  -- Phase 0: Detach ledger foreign keys
  -- -------------------------------------------------------------------------
  UPDATE investment_allocations SET settlement_transaction_id = NULL;
  UPDATE distribution_records SET ledger_transaction_id = NULL;
  UPDATE profit_settlement_allocations SET ledger_transaction_id = NULL;
  UPDATE profit_settlements SET settlement_ledger_transaction_id = NULL;
  UPDATE platform_revenue_entries SET ledger_transaction_id = NULL;
  UPDATE settlement_batches SET ledger_transaction_id = NULL;
  UPDATE financial_adjustments SET ledger_transaction_id = NULL
    WHERE ledger_transaction_id IS NOT NULL;

  -- -------------------------------------------------------------------------
  -- Phase 1: Cycle-scoped financial & settlement leaf tables
  -- -------------------------------------------------------------------------
  DELETE FROM profit_settlement_allocations;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('profit_settlement_allocations', n);

  DELETE FROM pool_manager_reviews;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('pool_manager_reviews', n);

  DELETE FROM distribution_records;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('distribution_records', n);

  DELETE FROM platform_revenue_entries;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('platform_revenue_entries', n);

  DELETE FROM profit_settlements;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('profit_settlements', n);

  DELETE FROM settlement_batches;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('settlement_batches', n);

  -- -------------------------------------------------------------------------
  -- Phase 2: Trading journal (cycle-scoped)
  -- -------------------------------------------------------------------------
  DELETE FROM trade_entries;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('trade_entries', n);

  DELETE FROM trade_snapshots;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('trade_snapshots', n);

  DELETE FROM trade_journals;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('trade_journals', n);

  DELETE FROM cycle_progress_events;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('cycle_progress_events', n);

  -- -------------------------------------------------------------------------
  -- Phase 3: Investment allocations & cycles
  -- -------------------------------------------------------------------------
  DELETE FROM investment_allocations;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('investment_allocations', n);

  DELETE FROM investment_cycles;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('investment_cycles', n);

  -- -------------------------------------------------------------------------
  -- Phase 4: Strategies
  -- -------------------------------------------------------------------------
  DELETE FROM strategies;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('strategies', n);

  -- -------------------------------------------------------------------------
  -- Phase 5: Pool-scoped governance, growth, legacy fund tables
  -- -------------------------------------------------------------------------
  DELETE FROM pool_governance_violations;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('pool_governance_violations', n);

  DELETE FROM pool_governance_warnings;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('pool_governance_warnings', n);

  DELETE FROM pool_governance_reviews;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('pool_governance_reviews', n);

  DELETE FROM pool_governance_scores WHERE fund_id IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('pool_governance_scores', n);

  DELETE FROM pool_governance_timeline WHERE fund_id IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('pool_governance_timeline', n);

  DELETE FROM pool_governance_rules WHERE fund_id IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('pool_governance_rules_fund_scoped', n);

  DELETE FROM pool_capital_allocations;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('pool_capital_allocations', n);

  DELETE FROM pool_invitations;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('pool_invitations', n);

  DELETE FROM daily_fund_snapshots;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('daily_fund_snapshots', n);

  DELETE FROM performance_snapshots;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('performance_snapshots', n);

  DELETE FROM pool_stats;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('pool_stats', n);

  DELETE FROM journal_entries;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('journal_entries', n);

  DELETE FROM trades;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('trades', n);

  DELETE FROM announcements;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('announcements', n);

  DELETE FROM crypto_deposit_wallets;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('crypto_deposit_wallets', n);

  UPDATE trader_challenges SET fund_id = NULL WHERE fund_id IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('trader_challenges_unlinked', n);

  DELETE FROM pool_manager_achievements WHERE fund_id IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('pool_manager_achievements_fund_scoped', n);

  DELETE FROM pool_manager_content WHERE fund_id IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('pool_manager_content_fund_scoped', n);

  -- Ratings tied to removed entities
  DELETE FROM rating_snapshots
  WHERE entity_type IN ('strategy', 'investment_cycle');
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('rating_snapshots_entity', n);

  DELETE FROM rating_history
  WHERE entity_type IN ('strategy', 'investment_cycle');
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('rating_history_entity', n);

  -- Orphaned platform events
  DELETE FROM platform_events
  WHERE entity_type IN (
    'strategy', 'investment_cycle', 'fund', 'profit_settlement',
    'profit_settlement_allocation', 'investment_allocation', 'trade_journal'
  );
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('platform_events_orphaned', n);

  -- -------------------------------------------------------------------------
  -- Phase 6: Legacy investor portfolios & pool-scoped transactions
  -- -------------------------------------------------------------------------
  DELETE FROM investor_portfolios;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('investor_portfolios', n);

  DELETE FROM transactions;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('transactions_fund_scoped', n);

  -- -------------------------------------------------------------------------
  -- Phase 7: Cycle/allocation ledger (preserve investor & platform accounts)
  -- -------------------------------------------------------------------------
  DELETE FROM ledger_entries
  WHERE transaction_id IN (
    SELECT id FROM ledger_transactions
    WHERE source_type IN (
      'profit_settlement', 'profit_settlement_allocation', 'investment_allocation',
      'settlement_batch', 'distribution_record', 'investment_cycle'
    )
  );
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('ledger_entries_cycle_scoped', n);

  DELETE FROM ledger_entries
  WHERE account_id IN (
    SELECT id FROM ledger_accounts
    WHERE owner_type IN ('investment_cycle', 'investment_allocation')
  );
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('ledger_entries_cycle_accounts', n);

  DELETE FROM ledger_transactions
  WHERE source_type IN (
    'profit_settlement', 'profit_settlement_allocation', 'investment_allocation',
    'settlement_batch', 'distribution_record', 'investment_cycle'
  );
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('ledger_transactions_cycle_scoped', n);

  DELETE FROM ledger_accounts
  WHERE owner_type IN ('investment_cycle', 'investment_allocation');
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('ledger_accounts_cycle_scoped', n);

  -- -------------------------------------------------------------------------
  -- Phase 8: Pools (funds)
  -- -------------------------------------------------------------------------
  DELETE FROM funds;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM _v1_count('pools_funds', n);

  -- Pool images removed via Storage API (see run-v1-cleanup.mjs)

END $$;

-- Validation snapshot
SELECT 'VALIDATION' AS section, metric, removed FROM _v1_cleanup_counts ORDER BY metric;

SELECT 'remaining_strategies' AS check, COUNT(*)::bigint AS count FROM strategies;
SELECT 'remaining_pools' AS check, COUNT(*)::bigint AS count FROM funds;
SELECT 'remaining_cycles' AS check, COUNT(*)::bigint AS count FROM investment_cycles;
SELECT 'remaining_allocations' AS check, COUNT(*)::bigint AS count FROM investment_allocations;
SELECT 'remaining_trade_journals' AS check, COUNT(*)::bigint AS count FROM trade_journals;
SELECT 'remaining_orphan_settlements' AS check, COUNT(*)::bigint AS count FROM profit_settlements;

SELECT 'profiles_preserved' AS check, COUNT(*)::bigint AS count FROM profiles;
SELECT 'pool_managers_preserved' AS check, COUNT(*)::bigint AS count FROM pool_managers;
SELECT 'platform_settings_preserved' AS check, COUNT(*)::bigint AS count FROM platform_settings;

COMMIT;
