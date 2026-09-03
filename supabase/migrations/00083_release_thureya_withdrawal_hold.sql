-- The admin release UI previously reported success without checking that the
-- persisted hold changed. Repair the confirmed affected account. Future
-- releases are verified by the application before success is shown.
UPDATE investor_correction_withdrawal_holds
SET
  is_withdrawal_allowed = true,
  released_at = now(),
  released_by = NULL
WHERE investor_id = '363659b5-8554-468b-bc93-0a227ca1b8da'::UUID
  AND is_withdrawal_allowed = false;

INSERT INTO audit_logs (
  actor_id,
  action,
  entity_type,
  entity_id,
  old_values,
  new_values
)
SELECT
  NULL,
  'investor_correction_withdrawal_release_repaired',
  'investor',
  '363659b5-8554-468b-bc93-0a227ca1b8da',
  jsonb_build_object('isWithdrawalAllowed', false),
  jsonb_build_object('isWithdrawalAllowed', true, 'reason', 'Admin release persistence repair')
WHERE EXISTS (
  SELECT 1
  FROM investor_correction_withdrawal_holds
  WHERE investor_id = '363659b5-8554-468b-bc93-0a227ca1b8da'::UUID
    AND is_withdrawal_allowed = true
    AND released_by IS NULL
);
