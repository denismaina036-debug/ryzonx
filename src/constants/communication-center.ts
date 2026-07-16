import type { CommunicationCategory } from "@/domain/communication/types";

export const COMMUNICATION_CENTER_ROLES = {
  SUPER_ADMIN: "super_administrator",
  COMM_MANAGER: "communication_manager",
  SUPPORT_AGENT: "support_agent",
  MARKETING: "marketing_manager",
  VIEWER: "viewer",
} as const;

/** Maps platform admin role to communication permissions (architecture for future RBAC). */
export const COMMUNICATION_PERMISSIONS = {
  dashboard: ["administrator"],
  inbox: ["administrator"],
  outbox: ["administrator"],
  templates: ["administrator"],
  broadcasts: ["administrator"],
  announcements: ["administrator"],
  support: ["administrator"],
  campaigns: ["administrator"],
  analytics: ["administrator"],
  settings: ["administrator"],
  builder: ["administrator"],
} as const;

export const ANNOUNCEMENT_STATUSES = ["draft", "scheduled", "published", "archived"] as const;
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];

export const ANNOUNCEMENT_CATEGORIES = [
  { id: "maintenance", label: "Maintenance" },
  { id: "market_update", label: "Market Update" },
  { id: "platform_update", label: "Platform Update" },
  { id: "security_notice", label: "Security Notice" },
  { id: "holiday_schedule", label: "Holiday Schedule" },
  { id: "feature_release", label: "Feature Release" },
] as const;

export const BROADCAST_AUDIENCES = [
  { id: "everyone", label: "Everyone" },
  { id: "investors", label: "Investors" },
  { id: "pool_managers", label: "Pool Managers" },
  { id: "applicants", label: "Applicants" },
  { id: "approved_managers", label: "Approved Managers" },
  { id: "specific_pool", label: "Specific Pool" },
  { id: "user_group", label: "User Group" },
  { id: "individual", label: "Individual User" },
] as const;

export const EMAIL_BUILDER_BLOCKS = [
  { type: "header", label: "Header", category: "layout" },
  { type: "logo", label: "Logo", category: "layout" },
  { type: "title", label: "Title", category: "content" },
  { type: "subtitle", label: "Subtitle", category: "content" },
  { type: "paragraph", label: "Paragraph", category: "content" },
  { type: "info_card", label: "Information Card", category: "content" },
  { type: "badge", label: "Status Badge", category: "content" },
  { type: "metric_row", label: "Metric Card", category: "content" },
  { type: "timeline", label: "Timeline", category: "content" },
  { type: "alert", label: "Alert", category: "content" },
  { type: "divider", label: "Divider", category: "layout" },
  { type: "primary_button", label: "Primary Button", category: "actions" },
  { type: "secondary_button", label: "Secondary Button", category: "actions" },
  { type: "footer", label: "Footer", category: "layout" },
] as const;

export const TEMPLATE_VARIABLE_GROUPS: Record<string, string[]> = {
  User: ["first_name", "last_name", "fullName", "dashboard_link", "preferences_url"],
  Financial: ["deposit_amount", "withdrawal_amount", "investment_amount", "current_balance", "profit", "roi"],
  Pool: ["pool_name", "manager_name", "investment_duration", "maturity_date"],
  Transaction: ["transaction_id", "application_status", "review_notes", "support_ticket"],
  Links: ["verification_link", "dashboard_link", "preferences_url", "unsubscribe_url"],
};

export const INBOX_CATEGORIES: CommunicationCategory[] = [
  "support",
  "investment",
  "system",
  "announcements",
  "pool_manager",
  "security",
];
