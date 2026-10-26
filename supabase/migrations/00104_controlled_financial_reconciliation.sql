-- Controlled, immutable financial reconciliation batches.
-- This migration creates the mechanism only. It contains no production data
-- corrections and cannot post a draft or unapproved batch.

CREATE TABLE financial_reconciliation_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code TEXT NOT NULL UNIQUE,
  batch_type TEXT NOT NULL CHECK (batch_type IN ('A', 'B', 'C', 'D', 'E')),
  investor_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'executing', 'completed', 'failed', 'cancelled')),
  snapshot_at TIMESTAMPTZ NOT NULL,
  snapshot_hash TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  approved_by UUID REFERENCES profiles(id) ON DELETE RESTRICT,
  approved_at TIMESTAMPTZ,
  executed_by UUID REFERENCES profiles(id) ON DELETE RESTRICT,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reconciliation_batch_approval_check CHECK (
    (status = 'draft' AND approved_by IS NULL AND approved_at IS NULL)
    OR status IN ('cancelled', 'failed')
    OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)
  )
);

CREATE TABLE financial_reconciliation_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES financial_reconciliation_batches(id) ON DELETE RESTRICT,
  sequence_number INTEGER NOT NULL CHECK (sequence_number > 0),
  investor_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
  settlement_id UUID REFERENCES cycle_investor_settlements(id) ON DELETE RESTRICT,
  source_transaction_id UUID REFERENCES transactions(id) ON DELETE RESTRICT,
  debit_account_id UUID NOT NULL REFERENCES ledger_accounts(id) ON DELETE RESTRICT,
  credit_account_id UUID NOT NULL REFERENCES ledger_accounts(id) ON DELETE RESTRICT,
  amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  reason TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key TEXT NOT NULL UNIQUE,
  expected_debit_balance NUMERIC(18, 2) NOT NULL,
  expected_credit_balance NUMERIC(18, 2) NOT NULL,
  expected_debit_owner_type ledger_owner_type NOT NULL,
  expected_debit_owner_id UUID,
  expected_credit_owner_type ledger_owner_type NOT NULL,
  expected_credit_owner_id UUID,
  precondition_hash TEXT NOT NULL,
  ledger_transaction_id UUID UNIQUE REFERENCES ledger_transactions(id) ON DELETE RESTRICT,
  compensation_of_entry_id UUID UNIQUE REFERENCES financial_reconciliation_entries(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'posted', 'compensated', 'cancelled')),
  before_snapshot JSONB,
  after_snapshot JSONB,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (batch_id, sequence_number),
  CONSTRAINT reconciliation_distinct_accounts CHECK (debit_account_id <> credit_account_id),
  CONSTRAINT reconciliation_reason_nonempty CHECK (char_length(trim(reason)) > 0)
);

CREATE INDEX financial_reconciliation_batches_status_idx
  ON financial_reconciliation_batches(status, created_at);
CREATE INDEX financial_reconciliation_entries_batch_status_idx
  ON financial_reconciliation_entries(batch_id, status, sequence_number);
CREATE INDEX financial_reconciliation_entries_investor_idx
  ON financial_reconciliation_entries(investor_id, created_at);

CREATE TRIGGER financial_reconciliation_batches_updated_at
  BEFORE UPDATE ON financial_reconciliation_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER financial_reconciliation_entries_updated_at
  BEFORE UPDATE ON financial_reconciliation_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION protect_financial_reconciliation_batch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Financial reconciliation batches are immutable';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' OR NEW.approved_by IS NOT NULL OR NEW.approved_at IS NOT NULL
      OR NEW.executed_by IS NOT NULL OR NEW.executed_at IS NOT NULL THEN
      RAISE EXCEPTION 'Financial reconciliation batches must be created as unapproved drafts';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.status = 'draft' AND NEW.status NOT IN ('draft', 'approved', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid reconciliation batch state transition';
  END IF;
  IF OLD.status <> 'draft' AND (
    NEW.batch_code IS DISTINCT FROM OLD.batch_code
    OR NEW.batch_type IS DISTINCT FROM OLD.batch_type
    OR NEW.investor_id IS DISTINCT FROM OLD.investor_id
    OR NEW.snapshot_at IS DISTINCT FROM OLD.snapshot_at
    OR NEW.snapshot_hash IS DISTINCT FROM OLD.snapshot_hash
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.evidence IS DISTINCT FROM OLD.evidence
    OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
    OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
  ) THEN
    RAISE EXCEPTION 'Approved reconciliation batch evidence is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION protect_financial_reconciliation_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch_status TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Financial reconciliation entries are immutable';
  END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT status INTO v_batch_status FROM financial_reconciliation_batches WHERE id = NEW.batch_id;
    IF v_batch_status IS DISTINCT FROM 'draft' THEN
      RAISE EXCEPTION 'Reconciliation entries can only be added to a draft batch';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.batch_id IS DISTINCT FROM OLD.batch_id
    OR NEW.sequence_number IS DISTINCT FROM OLD.sequence_number
    OR NEW.investor_id IS DISTINCT FROM OLD.investor_id
    OR NEW.settlement_id IS DISTINCT FROM OLD.settlement_id
    OR NEW.source_transaction_id IS DISTINCT FROM OLD.source_transaction_id
    OR NEW.debit_account_id IS DISTINCT FROM OLD.debit_account_id
    OR NEW.credit_account_id IS DISTINCT FROM OLD.credit_account_id
    OR NEW.amount IS DISTINCT FROM OLD.amount
    OR NEW.currency IS DISTINCT FROM OLD.currency
    OR NEW.reason IS DISTINCT FROM OLD.reason
    OR NEW.evidence IS DISTINCT FROM OLD.evidence
    OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
    OR NEW.expected_debit_balance IS DISTINCT FROM OLD.expected_debit_balance
    OR NEW.expected_credit_balance IS DISTINCT FROM OLD.expected_credit_balance
    OR NEW.expected_debit_owner_type IS DISTINCT FROM OLD.expected_debit_owner_type
    OR NEW.expected_debit_owner_id IS DISTINCT FROM OLD.expected_debit_owner_id
    OR NEW.expected_credit_owner_type IS DISTINCT FROM OLD.expected_credit_owner_type
    OR NEW.expected_credit_owner_id IS DISTINCT FROM OLD.expected_credit_owner_id
    OR NEW.precondition_hash IS DISTINCT FROM OLD.precondition_hash
    OR NEW.compensation_of_entry_id IS DISTINCT FROM OLD.compensation_of_entry_id THEN
    RAISE EXCEPTION 'Financial reconciliation entry evidence is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_financial_reconciliation_batch_before_write
  BEFORE INSERT OR UPDATE OR DELETE ON financial_reconciliation_batches
  FOR EACH ROW EXECUTE FUNCTION protect_financial_reconciliation_batch();
CREATE TRIGGER protect_financial_reconciliation_entry_before_write
  BEFORE INSERT OR UPDATE OR DELETE ON financial_reconciliation_entries
  FOR EACH ROW EXECUTE FUNCTION protect_financial_reconciliation_entry();

CREATE OR REPLACE FUNCTION reconciliation_account_balance(p_account_id UUID)
RETURNS NUMERIC
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ROUND(COALESCE(SUM(
    CASE
      WHEN account.account_type IN ('liability', 'equity', 'revenue')
        THEN CASE WHEN entry.entry_side = 'credit' THEN entry.amount ELSE -entry.amount END
      ELSE CASE WHEN entry.entry_side = 'debit' THEN entry.amount ELSE -entry.amount END
    END
  ), 0), 2)
  FROM ledger_accounts account
  LEFT JOIN ledger_entries entry ON entry.account_id = account.id
  LEFT JOIN ledger_transactions posting
    ON posting.id = entry.transaction_id AND posting.status = 'posted'
  WHERE account.id = p_account_id
    AND (entry.id IS NULL OR posting.id IS NOT NULL);
$$;

CREATE OR REPLACE FUNCTION reconciliation_precondition_hash(
  p_debit_account_id UUID,
  p_credit_account_id UUID,
  p_amount NUMERIC,
  p_debit_balance NUMERIC,
  p_credit_balance NUMERIC
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT md5(
    p_debit_account_id::TEXT || '|' || p_credit_account_id::TEXT || '|' ||
    ROUND(p_amount, 2)::TEXT || '|' || ROUND(p_debit_balance, 2)::TEXT || '|' ||
    ROUND(p_credit_balance, 2)::TEXT
  );
$$;

CREATE OR REPLACE FUNCTION validate_reconciliation_compensation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_original financial_reconciliation_entries%ROWTYPE;
BEGIN
  IF NEW.compensation_of_entry_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO v_original FROM financial_reconciliation_entries
  WHERE id = NEW.compensation_of_entry_id;
  IF v_original.id IS NULL OR v_original.status <> 'posted' THEN
    RAISE EXCEPTION 'Compensation requires a posted original reconciliation entry';
  END IF;
  IF NEW.debit_account_id IS DISTINCT FROM v_original.credit_account_id
    OR NEW.credit_account_id IS DISTINCT FROM v_original.debit_account_id
    OR ROUND(NEW.amount, 2) IS DISTINCT FROM ROUND(v_original.amount, 2) THEN
    RAISE EXCEPTION 'Compensation must exactly reverse the original accounts and amount';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_reconciliation_compensation_before_write
  BEFORE INSERT OR UPDATE OF compensation_of_entry_id, debit_account_id, credit_account_id, amount
  ON financial_reconciliation_entries
  FOR EACH ROW EXECUTE FUNCTION validate_reconciliation_compensation();

CREATE OR REPLACE FUNCTION approve_financial_reconciliation_batch(
  p_batch_id UUID,
  p_approver_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch financial_reconciliation_batches%ROWTYPE;
BEGIN
  IF p_approver_id IS NULL THEN RAISE EXCEPTION 'Reconciliation approver is required'; END IF;
  SELECT * INTO v_batch FROM financial_reconciliation_batches
  WHERE id = p_batch_id FOR UPDATE;
  IF v_batch.id IS NULL THEN RAISE EXCEPTION 'Reconciliation batch does not exist'; END IF;
  IF v_batch.status = 'approved' THEN
    RETURN jsonb_build_object('approved', false, 'batchId', v_batch.id, 'status', v_batch.status);
  END IF;
  IF v_batch.status <> 'draft' THEN RAISE EXCEPTION 'Only a draft reconciliation batch can be approved'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM financial_reconciliation_entries
    WHERE batch_id = v_batch.id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Reconciliation batch contains no pending entries';
  END IF;
  UPDATE financial_reconciliation_batches SET
    status = 'approved', approved_by = p_approver_id, approved_at = now()
  WHERE id = v_batch.id;
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_values)
  VALUES (p_approver_id, 'financial_reconciliation_batch_approved',
    'financial_reconciliation_batch', v_batch.id,
    jsonb_build_object('batch_code', v_batch.batch_code, 'snapshot_hash', v_batch.snapshot_hash));
  RETURN jsonb_build_object('approved', true, 'batchId', v_batch.id, 'status', 'approved');
END;
$$;

CREATE OR REPLACE FUNCTION apply_financial_reconciliation_batch(
  p_batch_id UUID,
  p_executor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch financial_reconciliation_batches%ROWTYPE;
  v_entry financial_reconciliation_entries%ROWTYPE;
  v_debit ledger_accounts%ROWTYPE;
  v_credit ledger_accounts%ROWTYPE;
  v_debit_balance NUMERIC(18, 2);
  v_credit_balance NUMERIC(18, 2);
  v_expected_hash TEXT;
  v_result JSONB;
  v_ledger_transaction_id UUID;
  v_posted_count INTEGER := 0;
BEGIN
  SELECT * INTO v_batch FROM financial_reconciliation_batches
  WHERE id = p_batch_id FOR UPDATE;
  IF v_batch.id IS NULL THEN RAISE EXCEPTION 'Reconciliation batch does not exist'; END IF;
  IF v_batch.status = 'completed' THEN
    RETURN jsonb_build_object('created', false, 'batchId', v_batch.id, 'postedCount', 0);
  END IF;
  IF v_batch.status <> 'approved' OR v_batch.approved_by IS NULL OR v_batch.approved_at IS NULL THEN
    RAISE EXCEPTION 'Reconciliation batch requires explicit approval';
  END IF;
  IF p_executor_id IS NULL THEN RAISE EXCEPTION 'Reconciliation executor is required'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM financial_reconciliation_entries
    WHERE batch_id = v_batch.id AND status IN ('pending', 'posted')
  ) THEN
    RAISE EXCEPTION 'Reconciliation batch contains no executable entries';
  END IF;

  UPDATE financial_reconciliation_batches SET status = 'executing', executed_by = p_executor_id
  WHERE id = v_batch.id;

  FOR v_entry IN
    SELECT * FROM financial_reconciliation_entries
    WHERE batch_id = v_batch.id AND status IN ('pending', 'posted')
    ORDER BY sequence_number FOR UPDATE
  LOOP
    IF v_entry.status = 'posted' THEN CONTINUE; END IF;

    -- Lock in stable UUID order so concurrent investor-scoped batches cannot deadlock.
    PERFORM id FROM ledger_accounts
    WHERE id IN (v_entry.debit_account_id, v_entry.credit_account_id)
    ORDER BY id FOR UPDATE;
    SELECT * INTO v_debit FROM ledger_accounts WHERE id = v_entry.debit_account_id;
    SELECT * INTO v_credit FROM ledger_accounts WHERE id = v_entry.credit_account_id;

    IF v_debit.id IS NULL OR v_credit.id IS NULL OR NOT v_debit.is_active OR NOT v_credit.is_active THEN
      RAISE EXCEPTION 'Reconciliation entry % contains a missing or inactive account', v_entry.id;
    END IF;
    IF v_debit.currency IS DISTINCT FROM v_entry.currency OR v_credit.currency IS DISTINCT FROM v_entry.currency THEN
      RAISE EXCEPTION 'Reconciliation entry % currency does not match both accounts', v_entry.id;
    END IF;
    IF v_debit.owner_type IS DISTINCT FROM v_entry.expected_debit_owner_type
      OR v_debit.owner_id IS DISTINCT FROM v_entry.expected_debit_owner_id
      OR v_credit.owner_type IS DISTINCT FROM v_entry.expected_credit_owner_type
      OR v_credit.owner_id IS DISTINCT FROM v_entry.expected_credit_owner_id THEN
      RAISE EXCEPTION 'Reconciliation entry % account ownership precondition failed', v_entry.id;
    END IF;

    v_debit_balance := reconciliation_account_balance(v_entry.debit_account_id);
    v_credit_balance := reconciliation_account_balance(v_entry.credit_account_id);
    IF ROUND(v_debit_balance, 2) IS DISTINCT FROM ROUND(v_entry.expected_debit_balance, 2)
      OR ROUND(v_credit_balance, 2) IS DISTINCT FROM ROUND(v_entry.expected_credit_balance, 2) THEN
      RAISE EXCEPTION 'Reconciliation entry % balance precondition failed', v_entry.id;
    END IF;
    v_expected_hash := reconciliation_precondition_hash(
      v_entry.debit_account_id, v_entry.credit_account_id, v_entry.amount,
      v_debit_balance, v_credit_balance
    );
    IF v_expected_hash IS DISTINCT FROM v_entry.precondition_hash THEN
      RAISE EXCEPTION 'Reconciliation entry % hash precondition failed', v_entry.id;
    END IF;

    v_result := post_ledger_transaction_atomic(
      'RECON-' || v_batch.batch_code || '-' || lpad(v_entry.sequence_number::TEXT, 4, '0'),
      v_entry.reason,
      'adjustment',
      'financial_reconciliation',
      v_entry.id,
      p_executor_id,
      jsonb_build_object(
        'batch_id', v_batch.id, 'batch_code', v_batch.batch_code,
        'entry_id', v_entry.id, 'investor_id', v_entry.investor_id,
        'settlement_id', v_entry.settlement_id, 'evidence', v_entry.evidence,
        'compensation_of_entry_id', v_entry.compensation_of_entry_id
      ),
      v_entry.idempotency_key,
      jsonb_build_array(
        jsonb_build_object('accountId', v_entry.debit_account_id, 'entrySide', 'debit', 'amount', v_entry.amount, 'memo', v_entry.reason),
        jsonb_build_object('accountId', v_entry.credit_account_id, 'entrySide', 'credit', 'amount', v_entry.amount, 'memo', v_entry.reason)
      )
    );
    v_ledger_transaction_id := NULLIF(v_result->'transaction'->>'id', '')::UUID;
    IF v_ledger_transaction_id IS NULL THEN RAISE EXCEPTION 'Ledger posting did not return a transaction'; END IF;

    UPDATE financial_reconciliation_entries SET
      status = 'posted', ledger_transaction_id = v_ledger_transaction_id,
      before_snapshot = jsonb_build_object('debitBalance', v_debit_balance, 'creditBalance', v_credit_balance),
      after_snapshot = jsonb_build_object(
        'debitBalance', reconciliation_account_balance(v_entry.debit_account_id),
        'creditBalance', reconciliation_account_balance(v_entry.credit_account_id)
      ),
      posted_at = now()
    WHERE id = v_entry.id;

    IF v_entry.compensation_of_entry_id IS NOT NULL THEN
      UPDATE financial_reconciliation_entries SET status = 'compensated'
      WHERE id = v_entry.compensation_of_entry_id;
    END IF;
    INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_values)
    VALUES (p_executor_id, 'financial_reconciliation_entry_posted', 'financial_reconciliation_entry', v_entry.id,
      jsonb_build_object('batch_id', v_batch.id, 'ledger_transaction_id', v_ledger_transaction_id, 'amount', v_entry.amount));
    v_posted_count := v_posted_count + 1;
  END LOOP;

  UPDATE financial_reconciliation_batches SET
    status = 'completed', executed_by = p_executor_id, executed_at = now()
  WHERE id = v_batch.id;
  RETURN jsonb_build_object('created', true, 'batchId', v_batch.id, 'postedCount', v_posted_count);
END;
$$;

CREATE OR REPLACE FUNCTION verify_financial_reconciliation_batch(p_batch_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'batchId', batch.id,
    'status', batch.status,
    'entryCount', COUNT(entry.id),
    'postedCount', COUNT(entry.id) FILTER (WHERE entry.status IN ('posted', 'compensated')),
    'missingLedgerCount', COUNT(entry.id) FILTER (
      WHERE entry.status IN ('posted', 'compensated') AND entry.ledger_transaction_id IS NULL
    ),
    'balancedLedgerCount', COUNT(entry.id) FILTER (
      WHERE entry.ledger_transaction_id IS NOT NULL AND (
        SELECT COALESCE(SUM(amount) FILTER (WHERE entry_side = 'debit'), 0)
        FROM ledger_entries WHERE transaction_id = entry.ledger_transaction_id
      ) = (
        SELECT COALESCE(SUM(amount) FILTER (WHERE entry_side = 'credit'), 0)
        FROM ledger_entries WHERE transaction_id = entry.ledger_transaction_id
      )
    )
  )
  FROM financial_reconciliation_batches batch
  LEFT JOIN financial_reconciliation_entries entry ON entry.batch_id = batch.id
  WHERE batch.id = p_batch_id
  GROUP BY batch.id, batch.status;
$$;

ALTER TABLE financial_reconciliation_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_reconciliation_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON financial_reconciliation_batches, financial_reconciliation_entries FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON financial_reconciliation_batches TO service_role;
-- Entry execution fields are written only by the SECURITY DEFINER executor.
-- Backend callers may prepare immutable draft entries but cannot forge a
-- posted status, ledger reference, or before/after snapshot directly.
GRANT SELECT, INSERT ON financial_reconciliation_entries TO service_role;
REVOKE ALL ON FUNCTION reconciliation_account_balance(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION reconciliation_precondition_hash(UUID, UUID, NUMERIC, NUMERIC, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION apply_financial_reconciliation_batch(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION approve_financial_reconciliation_batch(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION verify_financial_reconciliation_batch(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION protect_financial_reconciliation_batch() FROM PUBLIC;
REVOKE ALL ON FUNCTION protect_financial_reconciliation_entry() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reconciliation_account_balance(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION reconciliation_precondition_hash(UUID, UUID, NUMERIC, NUMERIC, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION apply_financial_reconciliation_batch(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION approve_financial_reconciliation_batch(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION verify_financial_reconciliation_batch(UUID) TO service_role;

COMMENT ON TABLE financial_reconciliation_batches IS
  'Approved investor-scoped immutable financial correction manifests.';
COMMENT ON TABLE financial_reconciliation_entries IS
  'Balanced reconciliation journals with exact ownership, balance and idempotency preconditions.';
