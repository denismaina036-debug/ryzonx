-- =============================================================================
-- Migration 028: Investment Operations Engine — Trading Journal & Cycle Progress
-- Architecture: 07_TRADING_JOURNAL.md, 06_INVESTMENT_CYCLES.md
-- =============================================================================

CREATE TYPE trade_journal_status AS ENUM ('active', 'archived');

CREATE TYPE trade_entry_direction AS ENUM ('long', 'short');

CREATE TYPE trade_entry_status AS ENUM (
  'draft',
  'open',
  'partially_closed',
  'closed',
  'archived'
);

CREATE TYPE cycle_progress_phase AS ENUM (
  'funding',
  'trading',
  'monitoring',
  'distribution_pending',
  'completed'
);

CREATE TYPE cycle_progress_event_type AS ENUM (
  'status_change',
  'trade_opened',
  'trade_closed',
  'trade_edited',
  'snapshot_created',
  'admin_review',
  'operational_flag',
  'cycle_advanced'
);

-- ---------------------------------------------------------------------------
-- trade_journals — one journal per investment cycle
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trade_journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_cycle_id UUID NOT NULL UNIQUE REFERENCES investment_cycles(id) ON DELETE RESTRICT,
  pool_manager_id UUID NOT NULL REFERENCES pool_managers(id) ON DELETE RESTRICT,
  strategy_id UUID NOT NULL REFERENCES strategies(id) ON DELETE RESTRICT,
  status trade_journal_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT trade_journals_cycle_manager_match CHECK (true)
);

COMMENT ON TABLE trade_journals IS
  'Official trading journal for an investment cycle. One journal per cycle.';

CREATE INDEX IF NOT EXISTS idx_trade_journals_cycle ON trade_journals(investment_cycle_id);
CREATE INDEX IF NOT EXISTS idx_trade_journals_manager ON trade_journals(pool_manager_id);

CREATE TRIGGER trade_journals_updated_at
  BEFORE UPDATE ON trade_journals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- trade_entries — individual trade records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trade_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID NOT NULL REFERENCES trade_journals(id) ON DELETE CASCADE,
  investment_cycle_id UUID NOT NULL REFERENCES investment_cycles(id) ON DELETE RESTRICT,
  pool_manager_id UUID NOT NULL REFERENCES pool_managers(id) ON DELETE RESTRICT,
  trade_reference TEXT NOT NULL UNIQUE,
  instrument TEXT NOT NULL,
  market TEXT,
  direction trade_entry_direction NOT NULL,
  entry_price NUMERIC(18, 8) NOT NULL CHECK (entry_price > 0),
  exit_price NUMERIC(18, 8) CHECK (exit_price IS NULL OR exit_price > 0),
  quantity NUMERIC(18, 8) NOT NULL CHECK (quantity > 0),
  status trade_entry_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT trade_entries_instrument_nonempty CHECK (char_length(trim(instrument)) > 0),
  CONSTRAINT trade_entries_closed_requires_exit CHECK (
    status NOT IN ('closed', 'partially_closed') OR exit_price IS NOT NULL
  ),
  CONSTRAINT trade_entries_open_requires_opened_at CHECK (
    status = 'draft' OR opened_at IS NOT NULL
  )
);

COMMENT ON TABLE trade_entries IS
  'Structured trade records within a cycle journal. Operational only — no broker execution.';

CREATE INDEX IF NOT EXISTS idx_trade_entries_journal ON trade_entries(journal_id);
CREATE INDEX IF NOT EXISTS idx_trade_entries_cycle ON trade_entries(investment_cycle_id);
CREATE INDEX IF NOT EXISTS idx_trade_entries_cycle_status ON trade_entries(investment_cycle_id, status);
CREATE INDEX IF NOT EXISTS idx_trade_entries_manager ON trade_entries(pool_manager_id);

CREATE TRIGGER trade_entries_updated_at
  BEFORE UPDATE ON trade_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- trade_snapshots — periodic operational metrics
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trade_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID NOT NULL REFERENCES trade_journals(id) ON DELETE CASCADE,
  investment_cycle_id UUID NOT NULL REFERENCES investment_cycles(id) ON DELETE RESTRICT,
  pool_manager_id UUID NOT NULL REFERENCES pool_managers(id) ON DELETE RESTRICT,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  open_positions_count INTEGER NOT NULL DEFAULT 0 CHECK (open_positions_count >= 0),
  closed_positions_count INTEGER NOT NULL DEFAULT 0 CHECK (closed_positions_count >= 0),
  total_trades INTEGER NOT NULL DEFAULT 0 CHECK (total_trades >= 0),
  winning_trades INTEGER NOT NULL DEFAULT 0 CHECK (winning_trades >= 0),
  losing_trades INTEGER NOT NULL DEFAULT 0 CHECK (losing_trades >= 0),
  average_holding_hours NUMERIC(12, 2),
  current_exposure NUMERIC(18, 2),
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE trade_snapshots IS
  'Point-in-time operational metrics for a cycle journal. Not financial settlement.';

CREATE INDEX IF NOT EXISTS idx_trade_snapshots_journal ON trade_snapshots(journal_id);
CREATE INDEX IF NOT EXISTS idx_trade_snapshots_cycle ON trade_snapshots(investment_cycle_id);

-- ---------------------------------------------------------------------------
-- cycle_progress_events — timeline for operational progress
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cycle_progress_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_cycle_id UUID NOT NULL REFERENCES investment_cycles(id) ON DELETE CASCADE,
  phase cycle_progress_phase NOT NULL,
  event_type cycle_progress_event_type NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cycle_progress_events_label_nonempty CHECK (char_length(trim(label)) > 0)
);

COMMENT ON TABLE cycle_progress_events IS
  'Operational timeline events for investment cycle progress tracking.';

CREATE INDEX IF NOT EXISTS idx_cycle_progress_events_cycle
  ON cycle_progress_events(investment_cycle_id, occurred_at DESC);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE trade_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_progress_events ENABLE ROW LEVEL SECURITY;

-- Journals: manager full access on own cycles; admin read/write; investors read summary via public cycles
CREATE POLICY trade_journals_manager_all ON trade_journals
  FOR ALL
  USING (pool_manager_id = get_approved_pool_manager_id())
  WITH CHECK (pool_manager_id = get_approved_pool_manager_id());

CREATE POLICY trade_journals_admin_all ON trade_journals
  FOR ALL
  USING (get_user_role() = 'administrator')
  WITH CHECK (get_user_role() = 'administrator');

CREATE POLICY trade_journals_public_read ON trade_journals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM investment_cycles c
      JOIN strategies s ON s.id = c.strategy_id
      WHERE c.id = trade_journals.investment_cycle_id
        AND c.status IN ('trading', 'distribution', 'completed', 'archived')
        AND s.visibility = 'public'
        AND s.status IN ('approved', 'available', 'operating', 'paused', 'archived')
    )
  );

-- Trade entries: manager write during operational phases; admin all; investors no direct row access (summary via API)
CREATE POLICY trade_entries_manager_all ON trade_entries
  FOR ALL
  USING (pool_manager_id = get_approved_pool_manager_id())
  WITH CHECK (pool_manager_id = get_approved_pool_manager_id());

CREATE POLICY trade_entries_admin_all ON trade_entries
  FOR ALL
  USING (get_user_role() = 'administrator')
  WITH CHECK (get_user_role() = 'administrator');

-- Snapshots
CREATE POLICY trade_snapshots_manager_all ON trade_snapshots
  FOR ALL
  USING (pool_manager_id = get_approved_pool_manager_id())
  WITH CHECK (pool_manager_id = get_approved_pool_manager_id());

CREATE POLICY trade_snapshots_admin_all ON trade_snapshots
  FOR ALL
  USING (get_user_role() = 'administrator')
  WITH CHECK (get_user_role() = 'administrator');

-- Progress events: manager read own; admin all; public read for public cycles in operational status
CREATE POLICY cycle_progress_events_manager_read ON cycle_progress_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM investment_cycles c
      WHERE c.id = cycle_progress_events.investment_cycle_id
        AND c.pool_manager_id = get_approved_pool_manager_id()
    )
  );

CREATE POLICY cycle_progress_events_manager_insert ON cycle_progress_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM investment_cycles c
      WHERE c.id = cycle_progress_events.investment_cycle_id
        AND c.pool_manager_id = get_approved_pool_manager_id()
    )
  );

CREATE POLICY cycle_progress_events_admin_all ON cycle_progress_events
  FOR ALL
  USING (get_user_role() = 'administrator')
  WITH CHECK (get_user_role() = 'administrator');

CREATE POLICY cycle_progress_events_public_read ON cycle_progress_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM investment_cycles c
      JOIN strategies s ON s.id = c.strategy_id
      WHERE c.id = cycle_progress_events.investment_cycle_id
        AND c.status IN ('funding', 'trading', 'distribution', 'completed', 'archived')
        AND s.visibility = 'public'
        AND s.status IN ('approved', 'available', 'operating', 'paused', 'archived')
    )
  );
