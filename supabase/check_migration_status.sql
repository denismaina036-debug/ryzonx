-- =============================================================================
-- Ryvonx — Check which migrations have been applied
-- Run this FIRST in Supabase SQL Editor to see what's missing.
-- =============================================================================

SELECT
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')        AS has_profiles,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pool_stats')     AS has_pool_stats,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transactions')   AS has_transactions,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'funds')          AS has_funds,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_fund_snapshots') AS has_daily_snapshots,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'testimonials')     AS has_testimonials;

-- If has_funds = false, you must run migrations 00001 → 00002 → 00003 BEFORE 00004.
-- Table names were NOT renamed during the RyvoFund → Ryvonx rebrand. The table is still called "funds".
