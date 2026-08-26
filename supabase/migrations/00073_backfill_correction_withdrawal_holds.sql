-- Existing corrections predate the hold table; place those accounts on hold too.
INSERT INTO investor_correction_withdrawal_holds (investor_id, is_withdrawal_allowed, corrected_at)
SELECT investor_id, false, max(created_at)
FROM (
  SELECT t.user_id AS investor_id, al.created_at FROM audit_logs al JOIN transactions t ON t.id = al.entity_id WHERE al.action = 'investor_deposit_amount_corrected'
  UNION ALL
  SELECT ia.investor_id, al.created_at FROM audit_logs al JOIN investment_allocations ia ON ia.id = al.entity_id WHERE al.action = 'investor_allocation_amount_corrected'
) corrections
GROUP BY investor_id
ON CONFLICT (investor_id) DO NOTHING;
NOTIFY pgrst, 'reload schema';
