-- Post-cleanup orphan checks (read-only)
SELECT 'strategies' AS entity, COUNT(*)::bigint AS remaining FROM strategies
UNION ALL SELECT 'funds', COUNT(*)::bigint FROM funds
UNION ALL SELECT 'investment_cycles', COUNT(*)::bigint FROM investment_cycles
UNION ALL SELECT 'investment_allocations', COUNT(*)::bigint FROM investment_allocations
UNION ALL SELECT 'profit_settlements', COUNT(*)::bigint FROM profit_settlements
UNION ALL SELECT 'trade_journals', COUNT(*)::bigint FROM trade_journals
UNION ALL SELECT 'investor_portfolios', COUNT(*)::bigint FROM investor_portfolios
UNION ALL SELECT 'transactions', COUNT(*)::bigint FROM transactions
UNION ALL SELECT 'pool_manager_reviews', COUNT(*)::bigint FROM pool_manager_reviews
UNION ALL SELECT 'rating_snapshots_strategy_cycle', COUNT(*)::bigint FROM rating_snapshots WHERE entity_type IN ('strategy', 'investment_cycle')
UNION ALL SELECT 'platform_events_orphans', COUNT(*)::bigint FROM platform_events WHERE entity_type IN ('strategy', 'investment_cycle', 'fund', 'profit_settlement', 'profit_settlement_allocation', 'investment_allocation', 'trade_journal')
UNION ALL SELECT 'profiles', COUNT(*)::bigint FROM profiles
UNION ALL SELECT 'pool_managers', COUNT(*)::bigint FROM pool_managers
UNION ALL SELECT 'platform_settings', COUNT(*)::bigint FROM platform_settings
UNION ALL SELECT 'investor_manager_follows', COUNT(*)::bigint FROM investor_manager_follows
UNION ALL SELECT 'ledger_accounts_investor', COUNT(*)::bigint FROM ledger_accounts WHERE owner_type = 'investor'
UNION ALL SELECT 'ledger_accounts_platform', COUNT(*)::bigint FROM ledger_accounts WHERE owner_type = 'platform'
UNION ALL SELECT 'ledger_transactions', COUNT(*)::bigint FROM ledger_transactions
UNION ALL SELECT 'ledger_entries', COUNT(*)::bigint FROM ledger_entries
ORDER BY entity;
