export const PLATFORM_EVENT_CATEGORIES = [
  "investment",
  "financial",
  "operations",
  "performance",
  "governance",
  "administration",
  "security",
  "system",
] as const;
export type PlatformEventCategory = (typeof PLATFORM_EVENT_CATEGORIES)[number];

export const PLATFORM_EVENT_SEVERITIES = ["info", "warning", "error", "critical"] as const;
export type PlatformEventSeverity = (typeof PLATFORM_EVENT_SEVERITIES)[number];

export const PLATFORM_EVENT_STATUSES = [
  "pending",
  "processing",
  "processed",
  "failed",
  "archived",
] as const;
export type PlatformEventStatus = (typeof PLATFORM_EVENT_STATUSES)[number];

export const NOTIFICATION_QUEUE_STATUSES = [
  "pending",
  "processing",
  "sent",
  "failed",
  "cancelled",
] as const;
export type NotificationQueueStatus = (typeof NOTIFICATION_QUEUE_STATUSES)[number];

export const WEBHOOK_DELIVERY_STATUSES = [
  "pending",
  "processing",
  "delivered",
  "failed",
  "cancelled",
] as const;
export type WebhookDeliveryStatus = (typeof WEBHOOK_DELIVERY_STATUSES)[number];

export const AUTOMATION_RULE_STATUSES = ["active", "inactive"] as const;
export type AutomationRuleStatus = (typeof AUTOMATION_RULE_STATUSES)[number];

/** Canonical platform event types */
export const PLATFORM_EVENT_TYPES = {
  ALLOCATION_CREATED: "allocation.created",
  ALLOCATION_FUNDING_CONFIRMED: "allocation.funding_confirmed",
  ALLOCATION_SETTLED: "allocation.settled",
  ALLOCATION_REJECTED: "allocation.rejected",
  ALLOCATION_CANCELLED: "allocation.cancelled",
  SETTLEMENT_BATCH_CREATED: "settlement.batch_created",
  SETTLEMENT_BATCH_COMPLETED: "settlement.batch_completed",
  DISTRIBUTION_PREPARED: "distribution.prepared",
  DISTRIBUTION_COMPLETED: "distribution.completed",
  LEDGER_TRANSACTION_POSTED: "ledger.transaction_posted",
  LEDGER_TRANSACTION_REVERSED: "ledger.transaction_reversed",
  TRADE_OPENED: "trade.opened",
  TRADE_CLOSED: "trade.closed",
  CYCLE_STARTED: "cycle.started",
  CYCLE_COMPLETED: "cycle.completed",
  CYCLE_STATUS_CHANGED: "cycle.status_changed",
  STRATEGY_SUBMITTED: "strategy.submitted",
  STRATEGY_APPROVED: "strategy.approved",
  RATING_CHANGED: "rating.changed",
  GOVERNANCE_ACTION: "governance.action",
  POOL_MANAGER_APPLICATION_SUBMITTED: "pool_manager.application_submitted",
  POOL_MANAGER_APPROVED: "pool_manager.approved",
  ADMIN_ALERT: "admin.alert",
  AUTH_LOGIN: "auth.login",
} as const;

export type PlatformEventType = (typeof PLATFORM_EVENT_TYPES)[keyof typeof PLATFORM_EVENT_TYPES];

export const PLATFORM_EVENT_AUDIT_ACTIONS = {
  EVENT_PUBLISHED: "platform_event_published",
  EVENT_PROCESSED: "platform_event_processed",
  EVENT_FAILED: "platform_event_failed",
  AUTOMATION_RULE_CREATED: "automation_rule_created",
  AUTOMATION_RULE_UPDATED: "automation_rule_updated",
  WEBHOOK_REGISTERED: "webhook_registered",
  WEBHOOK_DELIVERED: "webhook_delivered",
  WEBHOOK_FAILED: "webhook_delivery_failed",
  NOTIFICATION_QUEUED: "notification_queued",
  NOTIFICATION_SENT: "notification_sent",
} as const;

export const PLATFORM_EVENT_CATEGORY_LABELS: Record<PlatformEventCategory, string> = {
  investment: "Investment",
  financial: "Financial",
  operations: "Operations",
  performance: "Performance",
  governance: "Governance",
  administration: "Administration",
  security: "Security",
  system: "System",
};

export const PLATFORM_EVENT_SEVERITY_WEIGHT: Record<PlatformEventSeverity, number> = {
  info: 1,
  warning: 2,
  error: 3,
  critical: 4,
};
