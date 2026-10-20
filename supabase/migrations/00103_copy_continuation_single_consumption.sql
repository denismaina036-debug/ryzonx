-- A completed-period settlement is a single-use source of copied capital.
-- This claim is independent of the target period so concurrent or later calls
-- cannot consume the same source settlement into two different periods.

CREATE TABLE IF NOT EXISTS copy_continuation_claims (
  settlement_id UUID PRIMARY KEY
    REFERENCES cycle_investor_settlements(id) ON DELETE RESTRICT,
  target_cycle_id UUID NOT NULL
    REFERENCES investment_cycles(id) ON DELETE RESTRICT,
  transaction_id UUID UNIQUE
    REFERENCES transactions(id) ON DELETE RESTRICT,
  copy_session_id UUID,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE copy_continuation_claims ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE copy_continuation_claims FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE copy_continuation_claims TO service_role;

-- Record the earliest known consumption without rewriting historical money.
-- Any historical duplicate remains visible for the discrepancy report and must
-- be corrected separately through approved compensating ledger entries.
INSERT INTO copy_continuation_claims (
  settlement_id,
  target_cycle_id,
  transaction_id,
  copy_session_id,
  claimed_at
)
SELECT DISTINCT ON ((transaction.metadata->>'settlement_id')::UUID)
  (transaction.metadata->>'settlement_id')::UUID,
  (transaction.metadata->>'target_cycle_id')::UUID,
  transaction.id,
  NULLIF(transaction.metadata->>'copy_session_id', '')::UUID,
  transaction.created_at
FROM transactions transaction
WHERE transaction.payment_method = 'copy_continue'
  AND transaction.status = 'completed'
  AND transaction.metadata->>'settlement_id' IS NOT NULL
  AND transaction.metadata->>'target_cycle_id' IS NOT NULL
ORDER BY
  (transaction.metadata->>'settlement_id')::UUID,
  transaction.created_at,
  transaction.id
ON CONFLICT (settlement_id) DO NOTHING;

CREATE OR REPLACE FUNCTION claim_copy_continuation_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settlement_id UUID;
  v_target_cycle_id UUID;
  v_existing copy_continuation_claims%ROWTYPE;
  v_settlement cycle_investor_settlements%ROWTYPE;
  v_principal NUMERIC(18, 2);
  v_profit NUMERIC(18, 2);
  v_source_escrow_account_id UUID;
  v_profit_account_id UUID;
  v_reserved_account_id UUID;
  v_source_escrow_balance NUMERIC(18, 2);
  v_profit_liability_balance NUMERIC(18, 2);
  v_entries JSONB := '[]'::JSONB;
BEGIN
  IF NEW.payment_method IS DISTINCT FROM 'copy_continue'
    OR NEW.status IS DISTINCT FROM 'completed' THEN
    RETURN NEW;
  END IF;

  v_settlement_id := NULLIF(NEW.metadata->>'settlement_id', '')::UUID;
  v_target_cycle_id := NULLIF(NEW.metadata->>'target_cycle_id', '')::UUID;
  IF v_settlement_id IS NULL OR v_target_cycle_id IS NULL THEN
    RAISE EXCEPTION 'Copy continuation requires source settlement and target period';
  END IF;

  SELECT * INTO v_existing
  FROM copy_continuation_claims
  WHERE settlement_id = v_settlement_id
  FOR UPDATE;

  IF v_existing.settlement_id IS NOT NULL THEN
    IF v_existing.target_cycle_id IS DISTINCT FROM v_target_cycle_id THEN
      RAISE EXCEPTION 'Copying balance has already continued to another period';
    END IF;
    RETURN NEW;
  END IF;

  INSERT INTO copy_continuation_claims (
    settlement_id,
    target_cycle_id,
    transaction_id,
    copy_session_id,
    claimed_at
  ) VALUES (
    v_settlement_id,
    v_target_cycle_id,
    NEW.id,
    NULLIF(NEW.metadata->>'copy_session_id', '')::UUID,
    COALESCE(NEW.created_at, now())
  );

  SELECT * INTO v_settlement
  FROM cycle_investor_settlements
  WHERE id = v_settlement_id;
  IF v_settlement.id IS NULL THEN
    RAISE EXCEPTION 'Copy continuation source settlement does not exist';
  END IF;
  IF NEW.user_id IS DISTINCT FROM v_settlement.investor_id
    OR NEW.fund_id IS DISTINCT FROM v_settlement.fund_id
    OR NEW.metadata->>'source_cycle_id' IS DISTINCT FROM v_settlement.investment_cycle_id::TEXT
    OR NOT EXISTS (
      SELECT 1
      FROM investment_cycles target
      WHERE target.id = v_target_cycle_id
        AND target.fund_id = v_settlement.fund_id
        AND target.status IN ('approved', 'funding')
    ) THEN
    RAISE EXCEPTION 'Copy continuation does not match its owned source and target';
  END IF;

  v_principal := ROUND(COALESCE((NEW.metadata->>'capital_amount')::NUMERIC, 0), 2);
  v_profit := ROUND(COALESCE((NEW.metadata->>'profit_amount')::NUMERIC, 0), 2);
  IF ROUND(COALESCE(NEW.amount, 0), 2) IS DISTINCT FROM ROUND(v_principal + v_profit, 2)
    OR ROUND(v_principal + v_profit, 2) <= 0 THEN
    RAISE EXCEPTION 'Copy continuation amount does not match its capital lineage';
  END IF;

  SELECT id INTO v_source_escrow_account_id
  FROM ledger_accounts
  WHERE code = 'CYCLE_' || upper(substr(replace(v_settlement.investment_cycle_id::TEXT, '-', ''), 1, 12)) || '_ESCROW'
    AND is_active = true;
  SELECT id INTO v_reserved_account_id
  FROM ledger_accounts
  WHERE code = 'INVESTOR_' || upper(substr(replace(v_settlement.investor_id::TEXT, '-', ''), 1, 12)) || '_RESERVED'
    AND is_active = true;

  IF v_principal > 0 AND v_source_escrow_account_id IS NULL THEN
    RAISE EXCEPTION 'Source period escrow ledger account is missing';
  END IF;
  IF v_reserved_account_id IS NULL THEN
    RAISE EXCEPTION 'Investor reserved ledger account is missing';
  END IF;

  IF v_principal > 0 THEN
    SELECT COALESCE(SUM(
      CASE WHEN entry.entry_side = 'credit' THEN entry.amount ELSE -entry.amount END
    ), 0)
    INTO v_source_escrow_balance
    FROM ledger_entries entry
    JOIN ledger_transactions posting ON posting.id = entry.transaction_id
    WHERE entry.account_id = v_source_escrow_account_id
      AND posting.status = 'posted';
    IF ROUND(v_source_escrow_balance, 2) < v_principal THEN
      RAISE EXCEPTION 'Source period escrow ledger balance is insufficient';
    END IF;
  END IF;

  IF v_principal > 0 THEN
    v_entries := v_entries || jsonb_build_array(jsonb_build_object(
      'accountId', v_source_escrow_account_id,
      'entrySide', 'debit',
      'amount', v_principal,
      'memo', 'Completed-period capital continued'
    ));
  END IF;

  IF v_profit > 0 THEN
    SELECT id INTO v_profit_account_id
    FROM ledger_accounts
    WHERE code = 'INVESTOR_' || upper(substr(replace(v_settlement.investor_id::TEXT, '-', ''), 1, 8)) ||
      '_POOL_' || upper(substr(replace(v_settlement.fund_id::TEXT, '-', ''), 1, 8)) || '_PROFIT'
      AND is_active = true;
    IF v_profit_account_id IS NULL THEN
      RAISE EXCEPTION 'Investor copied-profit ledger account is missing';
    END IF;
    SELECT COALESCE(SUM(
      CASE WHEN entry.entry_side = 'credit' THEN entry.amount ELSE -entry.amount END
    ), 0)
    INTO v_profit_liability_balance
    FROM ledger_entries entry
    JOIN ledger_transactions posting ON posting.id = entry.transaction_id
    WHERE entry.account_id = v_profit_account_id
      AND posting.status = 'posted';
    IF ROUND(v_profit_liability_balance, 2) < v_profit THEN
      RAISE EXCEPTION 'Investor copied-profit ledger balance is insufficient';
    END IF;
    v_entries := v_entries || jsonb_build_array(jsonb_build_object(
      'accountId', v_profit_account_id,
      'entrySide', 'debit',
      'amount', v_profit,
      'memo', 'Realized copier profit continued'
    ));
  END IF;

  v_entries := v_entries || jsonb_build_array(jsonb_build_object(
    'accountId', v_reserved_account_id,
    'entrySide', 'credit',
    'amount', ROUND(v_principal + v_profit, 2),
    'memo', 'Capital reserved for next copy period'
  ));

  PERFORM post_ledger_transaction_atomic(
    'CPY-CONT-' || replace(v_settlement_id::TEXT, '-', ''),
    'Copying balance continued automatically',
    'transfer',
    'copy_continuation',
    v_settlement_id,
    NEW.user_id,
    jsonb_build_object(
      'transaction_id', NEW.id,
      'settlement_id', v_settlement_id,
      'source_cycle_id', v_settlement.investment_cycle_id,
      'target_cycle_id', v_target_cycle_id,
      'copy_session_id', NEW.metadata->>'copy_session_id'
    ),
    'copy-continuation:' || v_settlement_id::TEXT || ':ledger',
    v_entries
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS transactions_claim_copy_continuation ON transactions;
CREATE TRIGGER transactions_claim_copy_continuation
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION claim_copy_continuation_after_insert();

REVOKE ALL ON FUNCTION claim_copy_continuation_after_insert() FROM PUBLIC;

COMMENT ON TABLE copy_continuation_claims IS
  'Immutable single-consumption claim for each completed-period copy settlement.';
