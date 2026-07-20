-- Pool Manager admission workflow: multi-section application, admission paths, configurable fees

ALTER TABLE pool_manager_applications
  DROP CONSTRAINT IF EXISTS pool_manager_applications_current_stage_check;

ALTER TABLE pool_manager_applications
  ADD COLUMN IF NOT EXISTS admission_path TEXT
    CHECK (admission_path IS NULL OR admission_path IN ('trading_challenge', 'direct_access')),
  ADD COLUMN IF NOT EXISTS application_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'waived')),
  ADD COLUMN IF NOT EXISTS admission_fee_amount NUMERIC(12, 2);

ALTER TABLE pool_manager_applications
  ADD CONSTRAINT pool_manager_applications_current_stage_check
  CHECK (current_stage BETWEEN 1 AND 9);

-- Extended challenge enrollment statuses for admission workflow visibility
ALTER TABLE trader_challenge_enrollments
  DROP CONSTRAINT IF EXISTS trader_challenge_enrollments_status_check;

ALTER TABLE trader_challenge_enrollments
  ADD CONSTRAINT trader_challenge_enrollments_status_check
  CHECK (status IN (
    'pending_payment', 'paid', 'awaiting_setup', 'waiting',
    'pending_review', 'approved', 'challenge_assigned',
    'active', 'challenge_submitted', 'completed',
    'passed', 'failed', 'rejected', 'cancelled'
  ));

ALTER TABLE trader_challenge_enrollments
  ADD COLUMN IF NOT EXISTS challenge_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

INSERT INTO platform_settings (key, value, description)
VALUES (
  'pm_admission_settings',
  '{
    "tradingChallengeFee": 150,
    "directAccessFee": 200,
    "challengeInstructions": "Complete the evaluation challenge using the account credentials provided by RyvonX administration. Maintain a complete trading journal throughout the challenge period.",
    "challengeRules": "Follow all challenge rules provided by the administrator. No hedging across accounts. No copy trading unless explicitly permitted.",
    "challengeRequirements": "Complete the evaluation, maintain a complete trading journal, follow challenge rules, and meet performance objectives.",
    "challengePassingCriteria": "Meet profit target without breaching maximum drawdown limits within the challenge duration.",
    "challengeDurationDays": 30,
    "challengeProfitTargetPct": 8,
    "challengeMaxDrawdownPct": 10,
    "challengeDailyDrawdownPct": 5,
    "challengeJournalRequired": true,
    "challengeDocumentation": "Document every trade in the Challenge Journal with entry rationale, management notes, and outcomes."
  }'::jsonb,
  'Pool Manager admission fees and challenge configuration'
)
ON CONFLICT (key) DO NOTHING;
