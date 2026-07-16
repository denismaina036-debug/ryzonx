-- =============================================================================
-- Pool metadata, invitations, support tickets, notification types
-- =============================================================================

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'pool_invitation';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'pool_trading';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'support_reply';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'admin_message';

ALTER TABLE funds
  ADD COLUMN IF NOT EXISTS pool_description TEXT,
  ADD COLUMN IF NOT EXISTS trading_pair TEXT,
  ADD COLUMN IF NOT EXISTS pool_duration_days INTEGER,
  ADD COLUMN IF NOT EXISTS target_capital NUMERIC(18, 2),
  ADD COLUMN IF NOT EXISTS profit_target_pct NUMERIC(8, 4),
  ADD COLUMN IF NOT EXISTS target_investors INTEGER,
  ADD COLUMN IF NOT EXISTS return_tiers JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_invite_only BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS current_capital NUMERIC(18, 2) NOT NULL DEFAULT 0;

UPDATE funds
SET
  pool_description = COALESCE(
    pool_description,
    'Professionally managed pool. Strategy, timing, and pairs are defined by the RyvonX trading desk. News-driven and technical setups.'
  ),
  trading_pair = COALESCE(trading_pair, 'Multi-pair'),
  pool_duration_days = COALESCE(pool_duration_days, 90),
  target_capital = COALESCE(target_capital, 1000000),
  profit_target_pct = COALESCE(profit_target_pct, 15),
  target_investors = COALESCE(target_investors, 100),
  return_tiers = CASE
    WHEN return_tiers = '[]'::jsonb THEN
      '[
        {"minAmount": 100, "maxAmount": 999, "returnPct": 8},
        {"minAmount": 1000, "maxAmount": 4999, "returnPct": 12},
        {"minAmount": 5000, "maxAmount": null, "returnPct": 18}
      ]'::jsonb
    ELSE return_tiers
  END
WHERE id = '00000000-0000-4000-a000-000000000001';

CREATE TABLE IF NOT EXISTS pool_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fund_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pool_invitations_user
  ON pool_invitations (user_id, status);

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'replied', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user
  ON support_tickets (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  body TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket
  ON support_messages (ticket_id, created_at ASC);

ALTER TABLE pool_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pool_invitations' AND policyname = 'Users view own pool invitations'
  ) THEN
    CREATE POLICY "Users view own pool invitations"
      ON pool_invitations FOR SELECT
      USING (auth.uid() = user_id OR get_user_role() = 'administrator');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pool_invitations' AND policyname = 'Admins manage pool invitations'
  ) THEN
    CREATE POLICY "Admins manage pool invitations"
      ON pool_invitations FOR ALL
      USING (get_user_role() = 'administrator');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'support_tickets' AND policyname = 'Users manage own support tickets'
  ) THEN
    CREATE POLICY "Users manage own support tickets"
      ON support_tickets FOR ALL
      USING (auth.uid() = user_id OR get_user_role() = 'administrator');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'support_messages' AND policyname = 'Users view support messages on own tickets'
  ) THEN
    CREATE POLICY "Users view support messages on own tickets"
      ON support_messages FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM support_tickets t
          WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR get_user_role() = 'administrator')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'support_messages' AND policyname = 'Users post on own tickets'
  ) THEN
    CREATE POLICY "Users post on own tickets"
      ON support_messages FOR INSERT
      WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
          SELECT 1 FROM support_tickets t
          WHERE t.id = ticket_id AND t.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'support_messages' AND policyname = 'Admins post support replies'
  ) THEN
    CREATE POLICY "Admins post support replies"
      ON support_messages FOR INSERT
      WITH CHECK (get_user_role() = 'administrator');
  END IF;
END $$;

CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

NOTIFY pgrst, 'reload schema';
