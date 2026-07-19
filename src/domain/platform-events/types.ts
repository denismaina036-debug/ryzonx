import type {
  AutomationRuleStatus,
  NotificationQueueStatus,
  PlatformEventCategory,
  PlatformEventSeverity,
  PlatformEventStatus,
  WebhookDeliveryStatus,
} from "@/constants/platform-events";
import type { CommunicationCategory, CommunicationChannel, CommunicationPriority } from "@/domain/communication/types";

export interface PlatformEvent {
  id: string;
  eventType: string;
  category: PlatformEventCategory;
  entityType: string | null;
  entityId: string | null;
  actorId: string | null;
  correlationId: string | null;
  severity: PlatformEventSeverity;
  payload: Record<string, unknown>;
  status: PlatformEventStatus;
  processedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface PublishPlatformEventInput {
  eventType: string;
  category?: PlatformEventCategory;
  entityType?: string;
  entityId?: string;
  actorId?: string | null;
  correlationId?: string;
  severity?: PlatformEventSeverity;
  payload?: Record<string, unknown>;
}

export interface AutomationRuleAction {
  type: "notify_user" | "notify_admins" | "enqueue_webhook";
  recipientField?: string;
  templateSlug?: string;
  channels?: CommunicationChannel[];
  category?: CommunicationCategory;
  minSeverity?: PlatformEventSeverity;
}

export interface AutomationRule {
  id: string;
  ruleKey: string;
  name: string;
  description: string | null;
  eventType: string;
  category: PlatformEventCategory;
  status: AutomationRuleStatus;
  priority: number;
  conditions: Record<string, unknown>;
  actions: AutomationRuleAction[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationQueueItem {
  id: string;
  platformEventId: string | null;
  recipientUserId: string;
  templateSlug: string;
  channels: string[];
  category: CommunicationCategory;
  priority: CommunicationPriority;
  variables: Record<string, unknown>;
  metadata: Record<string, unknown>;
  status: NotificationQueueStatus;
  retryCount: number;
  nextRetryAt: string | null;
  processedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface NotificationHistoryRecord {
  id: string;
  notificationQueueId: string | null;
  platformEventId: string | null;
  recipientUserId: string;
  channel: string;
  templateSlug: string;
  title: string;
  body: string;
  status: string;
  communicationId: string | null;
  metadata: Record<string, unknown>;
  deliveredAt: string;
  createdAt: string;
}

export interface WebhookRegistration {
  id: string;
  name: string;
  url: string;
  secret: string;
  eventTypePattern: string;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  platformEventId: string | null;
  payload: Record<string, unknown>;
  signature: string | null;
  status: WebhookDeliveryStatus;
  httpStatus: number | null;
  responseBody: string | null;
  retryCount: number;
  nextRetryAt: string | null;
  deliveredAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface EventExplorerFilters {
  eventType?: string;
  category?: PlatformEventCategory;
  status?: PlatformEventStatus;
  entityType?: string;
  entityId?: string;
  limit?: number;
  offset?: number;
}

export interface AutomationCenterView {
  recentEvents: PlatformEvent[];
  pendingNotifications: number;
  failedNotifications: number;
  pendingWebhooks: number;
  failedWebhooks: number;
  activeRules: number;
  queueItems: NotificationQueueItem[];
  failedDeliveries: WebhookDelivery[];
  rules: AutomationRule[];
}
