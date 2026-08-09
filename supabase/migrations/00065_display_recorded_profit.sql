-- Admin baseline for total profit shown on marketplace pool pages.

ALTER TABLE funds
  ADD COLUMN IF NOT EXISTS display_recorded_profit NUMERIC(18, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN funds.display_recorded_profit IS
  'Admin-set initial realized profit baseline for marketplace pool performance. Combined with live pool manager journal profits.';
