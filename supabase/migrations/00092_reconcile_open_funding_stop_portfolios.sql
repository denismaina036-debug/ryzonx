-- A pre-trading stop returns the copied balance to the Funding Wallet. Keep the
-- fund portfolio in step with that completed transfer so it cannot remain in
-- the active copied-trader list.
CREATE OR REPLACE FUNCTION reconcile_copy_stop_funding_portfolio()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_capital NUMERIC(18, 2);
BEGIN
  IF NEW.payment_method <> 'copy_stop_funding' OR NEW.status <> 'completed'
    OR (TG_OP = 'UPDATE' AND OLD.status = 'completed') THEN
    RETURN NEW;
  END IF;
  v_capital := COALESCE((NEW.metadata->>'capital_amount')::NUMERIC, NEW.amount, 0);
  UPDATE investor_portfolios
  SET total_invested = GREATEST(total_invested - v_capital, 0),
      current_value = GREATEST(current_value - v_capital, 0),
      updated_at = now()
  WHERE user_id = NEW.user_id AND fund_id = NEW.fund_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reconcile_copy_stop_funding_portfolio_after_completion ON transactions;
CREATE TRIGGER reconcile_copy_stop_funding_portfolio_after_completion
  AFTER INSERT OR UPDATE OF status ON transactions
  FOR EACH ROW EXECUTE FUNCTION reconcile_copy_stop_funding_portfolio();

WITH released AS (
  SELECT user_id, fund_id,
    SUM(COALESCE((metadata->>'capital_amount')::NUMERIC, amount)) AS capital
  FROM transactions
  WHERE payment_method = 'copy_stop_funding' AND status = 'completed'
  GROUP BY user_id, fund_id
)
UPDATE investor_portfolios portfolio
SET total_invested = GREATEST(portfolio.total_invested - released.capital, 0),
    current_value = GREATEST(portfolio.current_value - released.capital, 0),
    updated_at = now()
FROM released
WHERE portfolio.user_id = released.user_id AND portfolio.fund_id = released.fund_id;

REVOKE ALL ON FUNCTION reconcile_copy_stop_funding_portfolio() FROM PUBLIC;
