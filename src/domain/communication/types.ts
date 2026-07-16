/**
 * RyvonX Communication System — domain types (Phase 5.5.1)
 */

export type CommunicationCategory =
  | "system"
  | "investment"
  | "pool_manager"
  | "marketplace"
  | "governance"
  | "capital_allocation"
  | "support"
  | "announcements"
  | "marketing"
  | "security"
  | "reports";

export type CommunicationChannel =
  | "email"
  | "in_app"
  | "sms"
  | "push"
  | "whatsapp"
  | "slack"
  | "webhook";

export type CommunicationStatus =
  | "draft"
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "failed"
  | "archived";

export type CommunicationPriority = "low" | "normal" | "high" | "critical";

export interface TemplateVariableSchema {
  key: string;
  label: string;
  sample?: string;
  required?: boolean;
}

export interface CommunicationTemplate {
  id: string;
  slug: string;
  name: string;
  category: CommunicationCategory;
  description: string | null;
  subjectTemplate: string | null;
  bodyTemplate: string;
  emailSpec?: import("@/services/communication/email/types").EmailTemplateSpec | null;
  inAppTitleTemplate: string | null;
  inAppBodyTemplate: string | null;
  variablesSchema: TemplateVariableSchema[];
  defaultChannels: CommunicationChannel[];
  isActive: boolean;
  isArchived?: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  lastEditedBy?: string | null;
}

export interface RenderedCommunication {
  subject: string | null;
  body: string;
  html?: string | null;
  plainText?: string | null;
  inAppTitle: string | null;
  inAppBody: string | null;
}

export interface CommunicationSendInput {
  /** Template slug from communication_templates */
  templateSlug: string;
  recipientUserId: string;
  variables?: Record<string, string | number | boolean | null | undefined>;
  category?: CommunicationCategory;
  priority?: CommunicationPriority;
  channels?: CommunicationChannel[];
  metadata?: Record<string, unknown>;
  relatedEntityType?: string;
  relatedEntityId?: string;
  triggeredBy?: string | null;
  /** Override notification_type for in-app channel (maps to existing enum) */
  notificationType?: string;
}

export interface CommunicationSendResult {
  communicationId: string;
  status: CommunicationStatus;
  deliveries: Array<{
    channel: CommunicationChannel;
    status: CommunicationStatus;
    deliveryId: string;
    notificationId?: string;
    error?: string;
  }>;
}

export interface CommunicationHistoryRecord {
  id: string;
  recipientUserId: string;
  templateSlug: string | null;
  category: CommunicationCategory;
  priority: CommunicationPriority;
  status: CommunicationStatus;
  renderedSubject: string | null;
  renderedBody: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  createdAt: string;
  deliveries: Array<{
    id: string;
    channel: CommunicationChannel;
    status: CommunicationStatus;
    errorMessage: string | null;
    sentAt: string | null;
  }>;
}

export interface TemplatePreviewInput {
  slug: string;
  variables?: Record<string, string | number | boolean | null | undefined>;
}

export interface TemplatePreviewResult {
  template: CommunicationTemplate;
  rendered: RenderedCommunication;
  sampleVariables: Record<string, string>;
  email?: {
    html: string;
    plainText: string;
  };
}

export interface CommunicationTemplateVersion {
  id: string;
  templateId: string;
  versionNumber: number;
  slug: string;
  name: string;
  category: CommunicationCategory;
  description: string | null;
  subjectTemplate: string | null;
  bodyTemplate: string;
  emailSpec: import("@/services/communication/email/types").EmailTemplateSpec | null;
  inAppTitleTemplate: string | null;
  inAppBodyTemplate: string | null;
  variablesSchema: TemplateVariableSchema[];
  defaultChannels: CommunicationChannel[];
  changeNotes: string | null;
  editedBy: string | null;
  createdAt: string;
}
