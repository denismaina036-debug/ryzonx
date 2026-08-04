-- =============================================================================
-- Migration 063: Enable RLS on tables missing row-level security
-- Fixes Supabase advisor: rls_disabled_in_public
-- =============================================================================

ALTER TABLE trade_profit_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_loss_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_reference_counters ENABLE ROW LEVEL SECURITY;

-- Internal counter table: no direct client access (service role + SECURITY DEFINER fn only).
REVOKE ALL ON TABLE transaction_reference_counters FROM anon, authenticated;

CREATE POLICY trade_profit_allocations_admin_all ON trade_profit_allocations
  FOR ALL
  USING (get_user_role() = 'administrator')
  WITH CHECK (get_user_role() = 'administrator');

CREATE POLICY trade_profit_allocations_investor_read ON trade_profit_allocations
  FOR SELECT
  USING (auth.uid() = investor_id);

CREATE POLICY trade_profit_allocations_manager_read ON trade_profit_allocations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM investment_cycles ic
      WHERE ic.id = trade_profit_allocations.investment_cycle_id
        AND ic.pool_manager_id = get_approved_pool_manager_id()
    )
  );

CREATE POLICY trade_loss_allocations_admin_all ON trade_loss_allocations
  FOR ALL
  USING (get_user_role() = 'administrator')
  WITH CHECK (get_user_role() = 'administrator');

CREATE POLICY trade_loss_allocations_investor_read ON trade_loss_allocations
  FOR SELECT
  USING (auth.uid() = investor_id);

CREATE POLICY trade_loss_allocations_manager_read ON trade_loss_allocations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM investment_cycles ic
      WHERE ic.id = trade_loss_allocations.investment_cycle_id
        AND ic.pool_manager_id = get_approved_pool_manager_id()
    )
  );
