-- =============================================================================
-- Migration 031: Platform Events, Automation & Notification Queue
-- Architecture: 10_PLATFORM_WORKFLOWS.md, 11_BUSINESS_RULES.md
-- =============================================================================

CREATE TYPE platform_event_category AS ENUM (
  'investment',
  'financial',
  'operations',
  'performance',
  'governance',
  'administration',
  'security',
  'system'
);

CREATE TYPE platform_event_severity AS ENUM ('info', 'warning', 'error', 'critical');

CREATE TYPE platform_event_status AS ENUM (
  'pending',
  'processing',
  'processed',
  'failed',
  'archived'
);

CREATE TYPE notification_queue_status AS ENUM (
  'pending',
  'processing',
  'sent',
  'failed',
  'cancelled'
);

CREATE TYPE notification_history_status AS ENUM (
  'delivered',
  'failed',
  'skipped',
  'cancelled'
);

CREATE TYPE webhook_delivery_status AS ENUM (
  'pending',
  'processing',
  'delivered',
  'failed',
  'cancelled'
);

CREATE TYPE automation_rule_status AS ENUM ('active', 'inactive');

CREATE TYPE event_subscription_status AS ENUM ('active', 'inactive');

-- ---------------------------------------------------------------------------
-- platform_events — authoritative event store
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  category platform_event_category NOT NULL DEFAULT 'system',
  entity_type TEXT,
  entity_id UUID,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  correlation_id UUID,
  severity platform_event_severity NOT NULL DEFAULT 'info',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status platform_event_status NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_events_type ON platform_events(event_type);
CREATE INDEX IF NOT EXISTS idx_platform_events_entity ON platform_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_platform_events_status ON platform_events(status);
CREATE INDEX IF NOT EXISTS idx_platform_events_created ON platform_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_events_correlation ON platform_events(correlation_id);

-- ---------------------------------------------------------------------------
-- event_subscriptions — internal subscribers (automation, webhooks, etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  event_type_pattern TEXT NOT NULL,
  subscriber_type TEXT NOT NULL CHECK (subscriber_type IN ('automation', 'webhook', 'notification', 'internal')),
  subscriber_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  status event_subscription_status NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT event_subscriptions_name_nonempty CHECK (char_length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_event_subscriptions_pattern ON event_subscriptions(event_type_pattern);

CREATE TRIGGER event_subscriptions_updated_at
  BEFORE UPDATE ON event_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- automation_rules — configurable event-driven automation
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL,
  category platform_event_category NOT NULL DEFAULT 'system',
  status automation_rule_status NOT NULL DEFAULT 'active',
  priority INTEGER NOT NULL DEFAULT 100,
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT automation_rules_name_nonempty CHECK (char_length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_event_type ON automation_rules(event_type);
CREATE INDEX IF NOT EXISTS idx_automation_rules_status ON automation_rules(status);

CREATE TRIGGER automation_rules_updated_at
  BEFORE UPDATE ON automation_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- notification_queue — queue-first notification dispatch
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_event_id UUID REFERENCES platform_events(id) ON DELETE SET NULL,
  recipient_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_slug TEXT NOT NULL,
  channels TEXT[] NOT NULL DEFAULT ARRAY['in_app']::TEXT[],
  category communication_category NOT NULL DEFAULT 'system',
  priority communication_priority NOT NULL DEFAULT 'normal',
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status notification_queue_status NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  next_retry_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_notification_queue_recipient ON notification_queue(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_event ON notification_queue(platform_event_id);

-- ---------------------------------------------------------------------------
-- notification_history — immutable delivery record
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_queue_id UUID REFERENCES notification_queue(id) ON DELETE SET NULL,
  platform_event_id UUID REFERENCES platform_events(id) ON DELETE SET NULL,
  recipient_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  template_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status notification_history_status NOT NULL DEFAULT 'delivered',
  communication_id UUID REFERENCES communications(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_history_recipient ON notification_history(recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_history_event ON notification_history(platform_event_id);

-- ---------------------------------------------------------------------------
-- webhook_registrations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS webhook_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  event_type_pattern TEXT NOT NULL DEFAULT '*',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT webhook_registrations_name_nonempty CHECK (char_length(trim(name)) > 0),
  CONSTRAINT webhook_registrations_url_nonempty CHECK (char_length(trim(url)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_webhook_registrations_active ON webhook_registrations(is_active);

CREATE TRIGGER webhook_registrations_updated_at
  BEFORE UPDATE ON webhook_registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- webhook_deliveries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhook_registrations(id) ON DELETE CASCADE,
  platform_event_id UUID REFERENCES platform_events(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  signature TEXT,
  status webhook_delivery_status NOT NULL DEFAULT 'pending',
  http_status INTEGER,
  response_body TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  next_retry_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);

-- ---------------------------------------------------------------------------
-- Seed default automation rules
-- ---------------------------------------------------------------------------
INSERT INTO automation_rules (rule_key, name, description, event_type, category, priority, actions)
VALUES
  (
    'allocation_funding_confirmed',
    'Funding Confirmed Notification',
    'Notify investor when allocation funding is confirmed',
    'allocation.funding_confirmed',
    'financial',
    10,
    '[{"type":"notify_user","recipientField":"investorId","templateSlug":"investment_updated","channels":["in_app","email"],"category":"investment"}]'::jsonb
  ),
  (
    'allocation_settled',
    'Allocation Settled Notification',
    'Notify investor when allocation is settled to cycle',
    'allocation.settled',
    'financial',
    10,
    '[{"type":"notify_user","recipientField":"investorId","templateSlug":"investment_updated","channels":["in_app","email"],"category":"investment"}]'::jsonb
  ),
  (
    'settlement_batch_completed',
    'Settlement Batch Completed',
    'Notify pool manager when settlement batch completes',
    'settlement.batch_completed',
    'financial',
    20,
    '[{"type":"notify_user","recipientField":"poolManagerUserId","templateSlug":"investment_updated","channels":["in_app"],"category":"pool_manager"}]'::jsonb
  ),
  (
    'distribution_completed',
    'Distribution Completed',
    'Notify investor when distribution is completed',
    'distribution.completed',
    'financial',
    10,
    '[{"type":"notify_user","recipientField":"investorId","templateSlug":"pool_profit_share","channels":["in_app","email"],"category":"investment"}]'::jsonb
  ),
  (
    'rating_changed',
    'Rating Changed Alert',
    'Notify pool manager when rating changes',
    'rating.changed',
    'performance',
    30,
    '[{"type":"notify_user","recipientField":"poolManagerUserId","templateSlug":"performance_update","channels":["in_app"],"category":"pool_manager"}]'::jsonb
  ),
  (
    'strategy_approved',
    'Strategy Approved',
    'Notify pool manager when strategy is approved',
    'strategy.approved',
    'investment',
    20,
    '[{"type":"notify_user","recipientField":"poolManagerUserId","templateSlug":"strategy_approved","channels":["in_app","email"],"category":"pool_manager"}]'::jsonb
  ),
  (
    'cycle_started',
    'Cycle Started',
    'Notify pool manager when cycle enters trading',
    'cycle.started',
    'investment',
    20,
    '[{"type":"notify_user","recipientField":"poolManagerUserId","templateSlug":"investment_updated","channels":["in_app"],"category":"pool_manager"}]'::jsonb
  ),
  (
    'cycle_completed',
    'Cycle Completed',
    'Notify investors and manager when cycle completes',
    'cycle.completed',
    'investment',
    20,
    '[{"type":"notify_user","recipientField":"poolManagerUserId","templateSlug":"investment_closed","channels":["in_app","email"],"category":"pool_manager"}]'::jsonb
  ),
  (
    'trade_closed',
    'Trade Closed Alert',
    'Notify pool manager when trade is closed',
    'trade.closed',
    'operations',
    40,
    '[{"type":"notify_user","recipientField":"poolManagerUserId","templateSlug":"investment_updated","channels":["in_app"],"category":"pool_manager"}]'::jsonb
  ),
  (
    'governance_action',
    'Governance Action Alert',
    'Notify affected pool manager on governance action',
    'governance.action',
    'governance',
    10,
    '[{"type":"notify_user","recipientField":"poolManagerUserId","templateSlug":"governance_warning","channels":["in_app","email"],"category":"governance"}]'::jsonb
  ),
  (
    'admin_platform_alert',
    'Admin Platform Alert',
    'Notify administrators on critical platform events',
    'admin.alert',
    'administration',
    5,
    '[{"type":"notify_admins","templateSlug":"admin_platform_alert","channels":["in_app"],"category":"system","minSeverity":"warning"}]'::jsonb
  )
ON CONFLICT (rule_key) DO NOTHING;

-- RLS
ALTER TABLE platform_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_events_admin_all ON platform_events
  FOR ALL USING (get_user_role() = 'administrator') WITH CHECK (get_user_role() = 'administrator');

CREATE POLICY event_subscriptions_admin_all ON event_subscriptions
  FOR ALL USING (get_user_role() = 'administrator') WITH CHECK (get_user_role() = 'administrator');

CREATE POLICY automation_rules_admin_all ON automation_rules
  FOR ALL USING (get_user_role() = 'administrator') WITH CHECK (get_user_role() = 'administrator');

CREATE POLICY notification_queue_admin_all ON notification_queue
  FOR ALL USING (get_user_role() = 'administrator') WITH CHECK (get_user_role() = 'administrator');

CREATE POLICY notification_queue_user_read ON notification_queue
  FOR SELECT USING (recipient_user_id = auth.uid());

CREATE POLICY notification_history_admin_all ON notification_history
  FOR ALL USING (get_user_role() = 'administrator') WITH CHECK (get_user_role() = 'administrator');

CREATE POLICY notification_history_user_read ON notification_history
  FOR SELECT USING (recipient_user_id = auth.uid());

CREATE POLICY webhook_registrations_admin_all ON webhook_registrations
  FOR ALL USING (get_user_role() = 'administrator') WITH CHECK (get_user_role() = 'administrator');

CREATE POLICY webhook_deliveries_admin_all ON webhook_deliveries
  FOR ALL USING (get_user_role() = 'administrator') WITH CHECK (get_user_role() = 'administrator');
