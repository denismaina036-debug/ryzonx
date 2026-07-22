-- Pool Manager / admin seeded raised capital for marketplace display
-- (baseline until live commitments exceed the seed).

ALTER TABLE funds
  ADD COLUMN IF NOT EXISTS display_raised_capital NUMERIC(18, 2) NOT NULL DEFAULT 0
    CHECK (display_raised_capital >= 0);

COMMENT ON COLUMN funds.display_raised_capital IS
  'PM/admin-set raised capital baseline shown until live raised capital exceeds this value.';
