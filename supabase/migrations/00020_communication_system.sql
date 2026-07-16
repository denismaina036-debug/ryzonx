-- =============================================================================
-- RyvonX Communication System — Phase 5.5.1 Architecture
-- Centralized communication engine: templates, history, deliveries, preferences
-- =============================================================================

-- Categories (extensible communication types)
CREATE TYPE communication_category AS ENUM (
  'system',
  'investment',
  'pool_manager',
  'marketplace',
  'governance',
  'capital_allocation',
  'support',
  'announcements',
  'marketing',
  'security',
  'reports'
);

CREATE TYPE communication_channel AS ENUM (
  'email',
  'in_app',
  'sms',
  'push',
  'whatsapp',
  'slack',
  'webhook'
);

CREATE TYPE communication_status AS ENUM (
  'draft',
  'queued',
  'sending',
  'sent',
  'delivered',
  'failed',
  'archived'
);

CREATE TYPE communication_priority AS ENUM (
  'low',
  'normal',
  'high',
  'critical'
);

-- -----------------------------------------------------------------------------
-- Templates (registry — content placeholders for template engine + preview)
-- -----------------------------------------------------------------------------
CREATE TABLE communication_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category communication_category NOT NULL,
  description TEXT,
  subject_template TEXT,
  body_template TEXT NOT NULL,
  in_app_title_template TEXT,
  in_app_body_template TEXT,
  variables_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_channels communication_channel[] NOT NULL DEFAULT ARRAY['in_app']::communication_channel[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_communication_templates_category
  ON communication_templates (category, is_active);

-- -----------------------------------------------------------------------------
-- Master communication history (immutable audit trail — never hard-delete)
-- -----------------------------------------------------------------------------
CREATE TABLE communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_id UUID REFERENCES communication_templates(id) ON DELETE SET NULL,
  template_slug TEXT,
  category communication_category NOT NULL,
  priority communication_priority NOT NULL DEFAULT 'normal',
  status communication_status NOT NULL DEFAULT 'queued',
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  rendered_subject TEXT,
  rendered_body TEXT,
  rendered_in_app_title TEXT,
  rendered_in_app_body TEXT,
  metadata JSONB,
  related_entity_type TEXT,
  related_entity_id UUID,
  triggered_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  error_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_communications_recipient
  ON communications (recipient_user_id, created_at DESC);

CREATE INDEX idx_communications_status
  ON communications (status, priority, created_at DESC);

CREATE INDEX idx_communications_entity
  ON communications (related_entity_type, related_entity_id)
  WHERE related_entity_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Per-channel delivery records + retry queue
-- -----------------------------------------------------------------------------
CREATE TABLE communication_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  communication_id UUID NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
  channel communication_channel NOT NULL,
  status communication_status NOT NULL DEFAULT 'queued',
  recipient_address TEXT,
  external_id TEXT,
  notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (communication_id, channel)
);

CREATE INDEX idx_communication_deliveries_retry
  ON communication_deliveries (status, next_retry_at)
  WHERE status = 'failed' AND next_retry_at IS NOT NULL;

CREATE INDEX idx_communication_deliveries_channel_status
  ON communication_deliveries (channel, status, created_at DESC);

-- -----------------------------------------------------------------------------
-- User communication preferences (opt-in/out per category + channel)
-- -----------------------------------------------------------------------------
CREATE TABLE communication_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category communication_category NOT NULL,
  channel communication_channel NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, category, channel)
);

CREATE INDEX idx_communication_preferences_user
  ON communication_preferences (user_id);

-- -----------------------------------------------------------------------------
-- Broadcast campaigns (structure only — implementation in later phase)
-- -----------------------------------------------------------------------------
CREATE TABLE broadcast_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  template_id UUID REFERENCES communication_templates(id) ON DELETE SET NULL,
  category communication_category NOT NULL DEFAULT 'announcements',
  status communication_status NOT NULL DEFAULT 'draft',
  audience_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_broadcast_campaigns_status
  ON broadcast_campaigns (status, scheduled_at);

-- -----------------------------------------------------------------------------
-- Link support messages to communication history (optional traceability)
-- -----------------------------------------------------------------------------
ALTER TABLE support_messages
  ADD COLUMN IF NOT EXISTS communication_id UUID REFERENCES communications(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
ALTER TABLE communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_campaigns ENABLE ROW LEVEL SECURITY;

-- Admins: full access to templates, history, deliveries, broadcasts
CREATE POLICY communication_templates_admin_all ON communication_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'administrator'
    )
  );

CREATE POLICY communications_admin_all ON communications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'administrator'
    )
  );

CREATE POLICY communications_recipient_read ON communications
  FOR SELECT USING (recipient_user_id = auth.uid());

CREATE POLICY communication_deliveries_admin_all ON communication_deliveries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'administrator'
    )
  );

CREATE POLICY communication_preferences_own ON communication_preferences
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY communication_preferences_admin_read ON communication_preferences
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'administrator'
    )
  );

CREATE POLICY broadcast_campaigns_admin_all ON broadcast_campaigns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'administrator'
    )
  );

-- -----------------------------------------------------------------------------
-- Seed starter templates (preview-ready placeholders — not final email HTML)
-- -----------------------------------------------------------------------------
INSERT INTO communication_templates (
  slug, name, category, description,
  subject_template, body_template,
  in_app_title_template, in_app_body_template,
  variables_schema, default_channels
) VALUES
(
  'deposit_approved',
  'Deposit Approved',
  'investment',
  'Sent when an administrator approves a crypto deposit.',
  'Your RyvonX deposit of {{amount}} has been approved',
  'Hi {{fullName}},\n\nYour deposit of {{amount}} has been approved and credited to your Funding Wallet.\n\nReference: {{reference}}\n\nThank you for investing with RyvonX.',
  'Deposit approved',
  'Your deposit of {{amount}} has been credited to your Funding Wallet.',
  '[{"key":"fullName","label":"Full name","sample":"Alex Investor"},{"key":"amount","label":"Amount","sample":"$5,000.00"},{"key":"reference","label":"Reference","sample":"DEP-2026-001"}]'::jsonb,
  ARRAY['email','in_app']::communication_channel[]
),
(
  'withdrawal_approved',
  'Withdrawal Approved',
  'investment',
  'Sent when a withdrawal request is approved.',
  'Your withdrawal of {{amount}} has been processed',
  'Hi {{fullName}},\n\nYour withdrawal of {{amount}} has been approved and is being processed.\n\nDestination: {{destination}}\n\nRyvonX Team',
  'Withdrawal approved',
  'Your withdrawal of {{amount}} is being processed.',
  '[{"key":"fullName","label":"Full name","sample":"Alex Investor"},{"key":"amount","label":"Amount","sample":"$2,500.00"},{"key":"destination","label":"Destination","sample":"USDT · TRC20"}]'::jsonb,
  ARRAY['email','in_app']::communication_channel[]
),
(
  'pool_investment_confirmed',
  'Pool Investment Confirmed',
  'investment',
  'Sent when an investor joins a pool.',
  'Investment confirmed — {{poolName}}',
  'Hi {{fullName}},\n\nYou have successfully invested {{amount}} in {{poolName}}.\n\nYour capital is now actively managed. Track performance from your investor dashboard.\n\nRyvonX',
  'Pool investment confirmed',
  '{{amount}} invested in {{poolName}}.',
  '[{"key":"fullName","label":"Full name","sample":"Alex Investor"},{"key":"amount","label":"Amount","sample":"$10,000.00"},{"key":"poolName","label":"Pool name","sample":"Ryvonx Main Pool"}]'::jsonb,
  ARRAY['email','in_app']::communication_channel[]
),
(
  'pool_profit_share',
  'Pool Profit Share',
  'investment',
  'Sent when trade profit is distributed to an investor.',
  'New profit recorded in {{poolName}}',
  'Hi {{fullName}},\n\nA trade in {{poolName}} recorded a {{profitLabel}} of {{amount}} on your allocation.\n\nTransfer to your Funding Wallet or reinvest from your dashboard.\n\nRyvonX',
  'Trade profit updated',
  '{{amount}} {{profitLabel}} recorded in {{poolName}}. Transfer or reinvest when ready.',
  '[{"key":"fullName","label":"Full name","sample":"Alex Investor"},{"key":"poolName","label":"Pool name","sample":"Ryvonx Main Pool"},{"key":"amount","label":"Amount","sample":"$357.14"},{"key":"profitLabel","label":"Profit/Loss label","sample":"profit"}]'::jsonb,
  ARRAY['in_app']::communication_channel[]
),
(
  'support_reply',
  'Support Reply',
  'support',
  'Sent when an administrator replies to a support ticket.',
  'Re: {{ticketSubject}}',
  'Hi {{fullName}},\n\nOur support team has replied to your ticket:\n\n"{{replyPreview}}"\n\nView the full conversation in your dashboard.\n\nRyvonX Support',
  'Support reply',
  'Our team replied to your ticket: {{ticketSubject}}',
  '[{"key":"fullName","label":"Full name","sample":"Alex Investor"},{"key":"ticketSubject","label":"Ticket subject","sample":"Deposit not showing"},{"key":"replyPreview","label":"Reply preview","sample":"We have located your deposit and it is being processed."}]'::jsonb,
  ARRAY['email','in_app']::communication_channel[]
),
(
  'trader_application_received',
  'Trader Application Received',
  'pool_manager',
  'Sent when a pool manager application is submitted.',
  'We received your Pool Manager application',
  'Hi {{fullName}},\n\nThank you for applying to the RyvonX Pool Manager Program.\n\nOur team will review your application and contact you with next steps.\n\nRyvonX',
  'Application received',
  'Your Pool Manager application is under review.',
  '[{"key":"fullName","label":"Full name","sample":"Jordan Manager"}]'::jsonb,
  ARRAY['email','in_app']::communication_channel[]
),
(
  'security_password_reset',
  'Password Reset',
  'security',
  'System security communication for password reset flows.',
  'Reset your RyvonX password',
  'Hi {{fullName}},\n\nWe received a request to reset your password.\n\nUse this link: {{resetLink}}\n\nIf you did not request this, ignore this email.\n\nRyvonX Security',
  NULL,
  NULL,
  '[{"key":"fullName","label":"Full name","sample":"Alex Investor"},{"key":"resetLink","label":"Reset link","sample":"https://app.ryvonx.com/reset-password?token=..."}]'::jsonb,
  ARRAY['email']::communication_channel[]
),
(
  'announcement_broadcast',
  'Platform Announcement',
  'announcements',
  'Broadcast template for platform-wide announcements.',
  '{{announcementTitle}}',
  'Hi {{fullName}},\n\n{{announcementBody}}\n\n— RyvonX',
  '{{announcementTitle}}',
  '{{announcementPreview}}',
  '[{"key":"fullName","label":"Full name","sample":"Alex Investor"},{"key":"announcementTitle","label":"Title","sample":"Scheduled maintenance"},{"key":"announcementBody","label":"Body","sample":"RyvonX will undergo maintenance on Saturday 2–4 AM UTC."},{"key":"announcementPreview","label":"Preview","sample":"Scheduled maintenance Saturday 2–4 AM UTC."}]'::jsonb,
  ARRAY['email','in_app']::communication_channel[]
);
