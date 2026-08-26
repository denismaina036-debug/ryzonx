-- Reconcile approved deposit that was marked approved before its wallet credit completed.
UPDATE investor_portfolios
SET available_balance = available_balance + 5230, updated_at = now()
WHERE user_id = '13f478f1-1d1e-449e-8a85-21f6f5535ccf'
  AND fund_id = '00000000-0000-4000-a000-000000000001'
  AND available_balance = 0;
