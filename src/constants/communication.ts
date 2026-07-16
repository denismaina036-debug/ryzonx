import type {
  CommunicationCategory,
  CommunicationChannel,
  CommunicationPriority,
  CommunicationStatus,
} from "@/domain/communication/types";

export const COMMUNICATION_CATEGORIES: CommunicationCategory[] = [
  "system",
  "investment",
  "pool_manager",
  "marketplace",
  "governance",
  "capital_allocation",
  "support",
  "announcements",
  "marketing",
  "security",
  "reports",
];

export const COMMUNICATION_CATEGORY_LABELS: Record<CommunicationCategory, string> = {
  system: "System",
  investment: "Investment",
  pool_manager: "Pool Manager",
  marketplace: "Marketplace",
  governance: "Governance",
  capital_allocation: "Capital Allocation",
  support: "Support",
  announcements: "Announcements",
  marketing: "Marketing",
  security: "Security",
  reports: "Reports",
};

export const COMMUNICATION_CHANNELS: CommunicationChannel[] = [
  "email",
  "in_app",
  "sms",
  "push",
  "whatsapp",
  "slack",
  "webhook",
];

export const COMMUNICATION_CHANNEL_LABELS: Record<CommunicationChannel, string> = {
  email: "Email",
  in_app: "In-App Notification",
  sms: "SMS",
  push: "Push Notification",
  whatsapp: "WhatsApp",
  slack: "Slack",
  webhook: "Webhook",
};

/** Channels implemented in Phase 5.5.1 */
export const ACTIVE_CHANNELS: CommunicationChannel[] = ["in_app", "email"];

export const COMMUNICATION_STATUSES: CommunicationStatus[] = [
  "draft",
  "queued",
  "sending",
  "sent",
  "delivered",
  "failed",
  "archived",
];

export const COMMUNICATION_STATUS_LABELS: Record<CommunicationStatus, string> = {
  draft: "Draft",
  queued: "Queued",
  sending: "Sending",
  sent: "Sent",
  delivered: "Delivered",
  failed: "Failed",
  archived: "Archived",
};

export const COMMUNICATION_PRIORITIES: CommunicationPriority[] = [
  "low",
  "normal",
  "high",
  "critical",
];

export const COMMUNICATION_PRIORITY_LABELS: Record<CommunicationPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  critical: "Critical",
};

/** Priority sort weight — higher processed first */
export const COMMUNICATION_PRIORITY_WEIGHT: Record<CommunicationPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
};

export const COMMUNICATION_ENTITY_TYPE = "communication" as const;

export const COMMUNICATION_AUDIT_ACTIONS = {
  SEND: "communication_send",
  SEND_FAILED: "communication_send_failed",
  DELIVERY_RETRY: "communication_delivery_retry",
  TEMPLATE_PREVIEW: "communication_template_preview",
  TEMPLATE_UPDATED: "communication_template_updated",
  TEMPLATE_CREATED: "communication_template_created",
  TEMPLATE_ARCHIVED: "communication_template_archived",
  TEMPLATE_TEST_SEND: "communication_template_test_send",
  TEMPLATE_SYNC: "communication_template_sync",
  BROADCAST_SCHEDULED: "communication_broadcast_scheduled",
} as const;

/** Default preference categories exposed to users (future settings UI) */
export const USER_PREFERENCE_CATEGORIES: CommunicationCategory[] = [
  "investment",
  "marketplace",
  "pool_manager",
  "governance",
  "reports",
  "marketing",
  "announcements",
];
