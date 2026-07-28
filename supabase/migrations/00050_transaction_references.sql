-- Professional transaction references (RVX-DEP-YYYYMMDD-NNNNNN) and searchable metadata.

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS transaction_reference TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_transaction_reference
  ON transactions (transaction_reference)
  WHERE transaction_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_metadata_gin
  ON transactions USING gin (metadata);

CREATE INDEX IF NOT EXISTS idx_transactions_payment_method
  ON transactions (payment_method)
  WHERE payment_method IS NOT NULL;

COMMENT ON COLUMN transactions.transaction_reference IS
  'Human-readable unique ID, e.g. RVX-DEP-20260728-000124';

COMMENT ON COLUMN transactions.metadata IS
  'Extensible transaction payload: network, txid, fee, confirmations, pool context, etc.';

CREATE TABLE IF NOT EXISTS transaction_reference_counters (
  ref_date DATE NOT NULL,
  ref_prefix TEXT NOT NULL,
  last_seq INT NOT NULL DEFAULT 0,
  PRIMARY KEY (ref_date, ref_prefix)
);

CREATE OR REPLACE FUNCTION next_transaction_reference(p_prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date TEXT := to_char(CURRENT_DATE, 'YYYYMMDD');
  v_seq INT;
BEGIN
  INSERT INTO transaction_reference_counters (ref_date, ref_prefix, last_seq)
  VALUES (CURRENT_DATE, p_prefix, 1)
  ON CONFLICT (ref_date, ref_prefix)
  DO UPDATE
    SET last_seq = transaction_reference_counters.last_seq + 1
  RETURNING last_seq INTO v_seq;

  RETURN 'RVX-' || p_prefix || '-' || v_date || '-' || lpad(v_seq::text, 6, '0');
END;
$$;

REVOKE ALL ON FUNCTION next_transaction_reference(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION next_transaction_reference(TEXT) TO service_role;

-- Backfill missing transaction_reference values for existing rows.
WITH classified AS (
  SELECT
    id,
    to_char(created_at AT TIME ZONE 'UTC', 'YYYYMMDD') AS ref_date,
    CASE
      WHEN type = 'deposit' THEN 'DEP'
      WHEN type = 'withdrawal' THEN 'WDL'
      WHEN payment_method = 'pool_allocation' THEN 'INV'
      WHEN payment_method = 'profit_reinvest' THEN 'INV'
      WHEN payment_method = 'pool_exit' THEN 'STL'
      WHEN payment_method = 'profit_transfer' THEN 'PFT'
      WHEN payment_method = 'trade_profit' AND notes ILIKE '%loss%' THEN 'LSS'
      WHEN payment_method = 'trade_profit' THEN 'PFT'
      WHEN payment_method IN ('pm_admission_fee', 'challenge_fee') THEN 'COM'
      WHEN type = 'adjustment' THEN 'ADJ'
      ELSE 'ADJ'
    END AS ref_prefix,
    created_at
  FROM transactions
  WHERE transaction_reference IS NULL
),
numbered AS (
  SELECT
    id,
    ref_prefix,
    ref_date,
    ROW_NUMBER() OVER (
      PARTITION BY ref_prefix, ref_date
      ORDER BY created_at, id
    ) AS seq
  FROM classified
)
UPDATE transactions t
SET transaction_reference =
  'RVX-' || n.ref_prefix || '-' || n.ref_date || '-' || lpad(n.seq::text, 6, '0')
FROM numbered n
WHERE t.id = n.id;
