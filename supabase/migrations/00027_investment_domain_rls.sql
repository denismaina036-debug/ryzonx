-- =============================================================================
-- Migration 027: Core Investment Domain — indexes, constraints, RLS policies
-- Persona separation: Pool Manager, Administrator, Investor, Public read.
-- =============================================================================

-- Ensure strategy ownership matches cycle pool manager
CREATE OR REPLACE FUNCTION validate_investment_cycle_manager()
RETURNS TRIGGER AS $$
DECLARE
  strategy_manager UUID;
BEGIN
  SELECT pool_manager_id INTO strategy_manager
  FROM strategies WHERE id = NEW.strategy_id;

  IF strategy_manager IS NULL THEN
    RAISE EXCEPTION 'Strategy not found for investment cycle';
  END IF;

  IF NEW.pool_manager_id IS DISTINCT FROM strategy_manager THEN
    RAISE EXCEPTION 'Investment cycle pool_manager_id must match strategy owner';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER investment_cycles_validate_manager
  BEFORE INSERT OR UPDATE OF strategy_id, pool_manager_id ON investment_cycles
  FOR EACH ROW EXECUTE FUNCTION validate_investment_cycle_manager();

-- Resolve approved pool manager id for authenticated user (RLS helper)
CREATE OR REPLACE FUNCTION get_approved_pool_manager_id()
RETURNS UUID AS $$
  SELECT id FROM pool_managers
  WHERE user_id = auth.uid() AND status = 'approved'
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- strategies RLS
-- ---------------------------------------------------------------------------
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY strategies_public_read ON strategies
  FOR SELECT
  USING (
    visibility = 'public'
    AND status IN ('approved', 'available', 'operating', 'paused', 'archived')
  );

CREATE POLICY strategies_manager_read ON strategies
  FOR SELECT
  USING (pool_manager_id = get_approved_pool_manager_id());

CREATE POLICY strategies_manager_insert ON strategies
  FOR INSERT
  WITH CHECK (pool_manager_id = get_approved_pool_manager_id());

CREATE POLICY strategies_manager_update ON strategies
  FOR UPDATE
  USING (pool_manager_id = get_approved_pool_manager_id())
  WITH CHECK (pool_manager_id = get_approved_pool_manager_id());

CREATE POLICY strategies_admin_all ON strategies
  FOR ALL
  USING (get_user_role() = 'administrator')
  WITH CHECK (get_user_role() = 'administrator');

-- ---------------------------------------------------------------------------
-- investment_cycles RLS
-- ---------------------------------------------------------------------------
ALTER TABLE investment_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY investment_cycles_public_read ON investment_cycles
  FOR SELECT
  USING (
    status IN ('approved', 'funding', 'trading', 'distribution', 'completed', 'archived')
    AND EXISTS (
      SELECT 1 FROM strategies s
      WHERE s.id = investment_cycles.strategy_id
        AND s.visibility = 'public'
        AND s.status IN ('approved', 'available', 'operating', 'paused', 'archived')
    )
  );

CREATE POLICY investment_cycles_manager_read ON investment_cycles
  FOR SELECT
  USING (pool_manager_id = get_approved_pool_manager_id());

CREATE POLICY investment_cycles_manager_insert ON investment_cycles
  FOR INSERT
  WITH CHECK (pool_manager_id = get_approved_pool_manager_id());

CREATE POLICY investment_cycles_manager_update ON investment_cycles
  FOR UPDATE
  USING (pool_manager_id = get_approved_pool_manager_id())
  WITH CHECK (pool_manager_id = get_approved_pool_manager_id());

CREATE POLICY investment_cycles_admin_all ON investment_cycles
  FOR ALL
  USING (get_user_role() = 'administrator')
  WITH CHECK (get_user_role() = 'administrator');

-- ---------------------------------------------------------------------------
-- investment_allocations RLS
-- ---------------------------------------------------------------------------
ALTER TABLE investment_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY investment_allocations_investor_read ON investment_allocations
  FOR SELECT
  USING (investor_id = auth.uid());

CREATE POLICY investment_allocations_investor_insert ON investment_allocations
  FOR INSERT
  WITH CHECK (investor_id = auth.uid());

CREATE POLICY investment_allocations_manager_read ON investment_allocations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM investment_cycles c
      WHERE c.id = investment_allocations.investment_cycle_id
        AND c.pool_manager_id = get_approved_pool_manager_id()
    )
  );

CREATE POLICY investment_allocations_admin_all ON investment_allocations
  FOR ALL
  USING (get_user_role() = 'administrator')
  WITH CHECK (get_user_role() = 'administrator');

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_strategies_manager_status
  ON strategies(pool_manager_id, status);

CREATE INDEX IF NOT EXISTS idx_investment_cycles_strategy_status
  ON investment_cycles(strategy_id, status);

CREATE INDEX IF NOT EXISTS idx_investment_allocations_cycle_status
  ON investment_allocations(investment_cycle_id, status);
