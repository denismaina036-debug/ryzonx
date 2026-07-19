-- =============================================================================
-- Migration 030: Financial Core — Double-Entry Ledger & Settlement
-- Architecture: 11_BUSINESS_RULES.md, 10_PLATFORM_WORKFLOWS.md
-- =============================================================================

CREATE TYPE ledger_account_type AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');

CREATE TYPE ledger_owner_type AS ENUM (
  'platform',
  'investor',
  'pool_manager',
  'investment_cycle',
  'investment_allocation'
);

CREATE TYPE ledger_entry_side AS ENUM ('debit', 'credit');

CREATE TYPE ledger_transaction_type AS ENUM (
  'opening_balance',
  'deposit_credit',
  'allocation_reserve',
  'allocation_settlement',
  'allocation_release',
  'distribution',
  'adjustment',
  'reversal',
  'transfer'
);

CREATE TYPE ledger_transaction_status AS ENUM ('pending', 'posted', 'reversed');

CREATE TYPE settlement_batch_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled'
);

CREATE TYPE distribution_record_status AS ENUM (
  'preparation',
  'batch',
  'pending',
  'approved',
  'completed',
  'cancelled'
);

CREATE TYPE financial_adjustment_status AS ENUM ('pending', 'approved', 'posted', 'rejected');

-- Extend allocation lifecycle for settlement
ALTER TYPE investment_allocation_status ADD VALUE IF NOT EXISTS 'funding_confirmed';
ALTER TYPE investment_allocation_status ADD VALUE IF NOT EXISTS 'settled';
ALTER TYPE investment_allocation_status ADD VALUE IF NOT EXISTS 'rejected';

-- ---------------------------------------------------------------------------
-- ledger_accounts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ledger_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  account_type ledger_account_type NOT NULL,
  owner_type ledger_owner_type NOT NULL DEFAULT 'platform',
  owner_id UUID,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ledger_accounts_name_nonempty CHECK (char_length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_ledger_accounts_owner ON ledger_accounts(owner_type, owner_id);

CREATE TRIGGER ledger_accounts_updated_at
  BEFORE UPDATE ON ledger_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- ledger_transactions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ledger_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  transaction_type ledger_transaction_type NOT NULL,
  status ledger_transaction_status NOT NULL DEFAULT 'posted',
  source_type TEXT,
  source_id UUID,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reversed_at TIMESTAMPTZ,
  reversal_transaction_id UUID REFERENCES ledger_transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_transactions_source ON ledger_transactions(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_ledger_transactions_posted ON ledger_transactions(posted_at DESC);

-- ---------------------------------------------------------------------------
-- ledger_entries — every transaction must balance
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES ledger_transactions(id) ON DELETE RESTRICT,
  account_id UUID NOT NULL REFERENCES ledger_accounts(id) ON DELETE RESTRICT,
  entry_side ledger_entry_side NOT NULL,
  amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_transaction ON ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account ON ledger_entries(account_id);

-- ---------------------------------------------------------------------------
-- settlement_batches
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settlement_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_reference TEXT NOT NULL UNIQUE,
  investment_cycle_id UUID REFERENCES investment_cycles(id) ON DELETE RESTRICT,
  status settlement_batch_status NOT NULL DEFAULT 'pending',
  total_amount NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  allocation_count INTEGER NOT NULL DEFAULT 0 CHECK (allocation_count >= 0),
  ledger_transaction_id UUID REFERENCES ledger_transactions(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_settlement_batches_cycle ON settlement_batches(investment_cycle_id);

CREATE TRIGGER settlement_batches_updated_at
  BEFORE UPDATE ON settlement_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- distribution_records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS distribution_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_batch_id UUID,
  investment_cycle_id UUID NOT NULL REFERENCES investment_cycles(id) ON DELETE RESTRICT,
  investment_allocation_id UUID NOT NULL REFERENCES investment_allocations(id) ON DELETE RESTRICT,
  investor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  amount NUMERIC(18, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status distribution_record_status NOT NULL DEFAULT 'preparation',
  ledger_transaction_id UUID REFERENCES ledger_transactions(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_distribution_records_cycle ON distribution_records(investment_cycle_id);
CREATE INDEX IF NOT EXISTS idx_distribution_records_investor ON distribution_records(investor_id);
CREATE INDEX IF NOT EXISTS idx_distribution_records_allocation ON distribution_records(investment_allocation_id);

CREATE TRIGGER distribution_records_updated_at
  BEFORE UPDATE ON distribution_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- financial_adjustments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS financial_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_reference TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  debit_account_id UUID NOT NULL REFERENCES ledger_accounts(id) ON DELETE RESTRICT,
  credit_account_id UUID NOT NULL REFERENCES ledger_accounts(id) ON DELETE RESTRICT,
  status financial_adjustment_status NOT NULL DEFAULT 'pending',
  ledger_transaction_id UUID REFERENCES ledger_transactions(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT financial_adjustments_reason_nonempty CHECK (char_length(trim(reason)) > 0)
);

CREATE TRIGGER financial_adjustments_updated_at
  BEFORE UPDATE ON financial_adjustments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Allocation settlement linkage
ALTER TABLE investment_allocations
  ADD COLUMN IF NOT EXISTS settlement_transaction_id UUID REFERENCES ledger_transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS funding_confirmed_at TIMESTAMPTZ;

-- Platform seed accounts
INSERT INTO ledger_accounts (code, name, account_type, owner_type)
VALUES
  ('PLATFORM_CASH', 'Platform Cash Pool', 'asset', 'platform'),
  ('PLATFORM_SUSPENSE', 'Platform Suspense', 'asset', 'platform'),
  ('PLATFORM_EQUITY', 'Platform Equity', 'equity', 'platform')
ON CONFLICT (code) DO NOTHING;

-- Balance validation trigger
CREATE OR REPLACE FUNCTION validate_ledger_transaction_balance()
RETURNS TRIGGER AS $$
DECLARE
  debit_total NUMERIC(18, 2);
  credit_total NUMERIC(18, 2);
BEGIN
  SELECT COALESCE(SUM(amount) FILTER (WHERE entry_side = 'debit'), 0),
         COALESCE(SUM(amount) FILTER (WHERE entry_side = 'credit'), 0)
  INTO debit_total, credit_total
  FROM ledger_entries
  WHERE transaction_id = NEW.transaction_id;

  IF debit_total > 0 AND credit_total > 0 AND debit_total <> credit_total THEN
    RAISE EXCEPTION 'Ledger transaction % is unbalanced: debits=% credits=%',
      NEW.transaction_id, debit_total, credit_total;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER ledger_entries_balance_check
  AFTER INSERT OR UPDATE ON ledger_entries
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION validate_ledger_transaction_balance();

-- RLS
ALTER TABLE ledger_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY ledger_accounts_admin_all ON ledger_accounts
  FOR ALL USING (get_user_role() = 'administrator') WITH CHECK (get_user_role() = 'administrator');

CREATE POLICY ledger_accounts_investor_read ON ledger_accounts
  FOR SELECT USING (owner_type = 'investor' AND owner_id = auth.uid());

CREATE POLICY ledger_transactions_admin_all ON ledger_transactions
  FOR ALL USING (get_user_role() = 'administrator') WITH CHECK (get_user_role() = 'administrator');

CREATE POLICY ledger_entries_admin_all ON ledger_entries
  FOR ALL USING (get_user_role() = 'administrator') WITH CHECK (get_user_role() = 'administrator');

CREATE POLICY settlement_batches_admin_all ON settlement_batches
  FOR ALL USING (get_user_role() = 'administrator') WITH CHECK (get_user_role() = 'administrator');

CREATE POLICY settlement_batches_manager_read ON settlement_batches
  FOR SELECT USING (
    investment_cycle_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM investment_cycles c
      WHERE c.id = settlement_batches.investment_cycle_id
        AND c.pool_manager_id = get_approved_pool_manager_id()
    )
  );

CREATE POLICY distribution_records_admin_all ON distribution_records
  FOR ALL USING (get_user_role() = 'administrator') WITH CHECK (get_user_role() = 'administrator');

CREATE POLICY distribution_records_investor_read ON distribution_records
  FOR SELECT USING (investor_id = auth.uid());

CREATE POLICY distribution_records_manager_read ON distribution_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM investment_cycles c
      WHERE c.id = distribution_records.investment_cycle_id
        AND c.pool_manager_id = get_approved_pool_manager_id()
    )
  );

CREATE POLICY financial_adjustments_admin_all ON financial_adjustments
  FOR ALL USING (get_user_role() = 'administrator') WITH CHECK (get_user_role() = 'administrator');
