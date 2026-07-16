-- =============================================================================
-- Ryvonx Public Transaction Feed
-- Supports investor opt-in visibility for deposits and withdrawals
-- =============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS show_activity_publicly BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN profiles.show_activity_publicly IS
  'Investor preference: when false, their completed transactions are hidden from the public feed.';

COMMENT ON COLUMN transactions.is_public IS
  'Set from investor preference when approved; controls visibility on the public activity feed.';

CREATE INDEX IF NOT EXISTS idx_transactions_public_feed
  ON transactions (fund_id, created_at DESC)
  WHERE is_public = true AND status IN ('approved', 'completed') AND type IN ('deposit', 'withdrawal');

-- Allow anonymous/public visitors to read opted-in completed transactions
CREATE POLICY "Public can view public completed transactions"
  ON transactions FOR SELECT
  USING (
    is_public = true
    AND status IN ('approved', 'completed')
    AND type IN ('deposit', 'withdrawal')
  );
