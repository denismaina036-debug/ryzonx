CREATE TABLE IF NOT EXISTS investor_correction_withdrawal_holds (
  investor_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  is_withdrawal_allowed BOOLEAN NOT NULL DEFAULT false,
  corrected_at TIMESTAMPTZ NOT NULL DEFAULT now(), released_at TIMESTAMPTZ, released_by UUID REFERENCES profiles(id)
);
CREATE INDEX IF NOT EXISTS idx_investor_correction_withdrawal_holds_allowed ON investor_correction_withdrawal_holds(is_withdrawal_allowed);
NOTIFY pgrst, 'reload schema';
