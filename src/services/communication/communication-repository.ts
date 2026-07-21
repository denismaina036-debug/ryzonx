import { createAdminClient } from "@/lib/supabase/admin";
import { COMMUNICATION_TEMPLATE_REGISTRY, getRegistryTemplate } from "@/domain/communication/template-registry";
import { getCatalogEntry } from "@/services/communication/email/catalog";
import { catalogEntryToCommunicationTemplate } from "@/services/communication/email/catalog-bridge";
import type {
  CommunicationCategory,
  CommunicationChannel,
  CommunicationPriority,
  CommunicationStatus,
  CommunicationTemplate,
  TemplateVariableSchema,
} from "@/domain/communication/types";

type TemplateRow = {
  id: string;
  slug: string;
  name: string;
  category: CommunicationCategory;
  description: string | null;
  subject_template: string | null;
  body_template: string;
  email_spec: import("@/services/communication/email/types").EmailTemplateSpec | null;
  in_app_title_template: string | null;
  in_app_body_template: string | null;
  variables_schema: TemplateVariableSchema[] | null;
  default_channels: CommunicationChannel[] | null;
  is_active: boolean;
  is_archived?: boolean;
  version: number;
  last_edited_by?: string | null;
  created_at: string;
  updated_at: string;
};

function mapTemplate(row: TemplateRow): CommunicationTemplate {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    description: row.description,
    subjectTemplate: row.subject_template,
    bodyTemplate: row.body_template,
    emailSpec: row.email_spec,
    inAppTitleTemplate: row.in_app_title_template,
    inAppBodyTemplate: row.in_app_body_template,
    variablesSchema: Array.isArray(row.variables_schema) ? row.variables_schema : [],
    defaultChannels: row.default_channels ?? ["in_app"],
    isActive: row.is_active,
    isArchived: row.is_archived ?? false,
    version: row.version,
    lastEditedBy: row.last_edited_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function enrichFromCatalog(template: CommunicationTemplate): CommunicationTemplate {
  const entry = getCatalogEntry(template.slug);
  if (!entry) return template;

  const fromCatalog = catalogEntryToCommunicationTemplate(entry, {
    id: template.id,
    isActive: template.isActive,
    isArchived: template.isArchived,
    version: template.version,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
    lastEditedBy: template.lastEditedBy ?? null,
  });

  if (template.emailSpec) {
    return {
      ...template,
      variablesSchema:
        template.variablesSchema.length > 0
          ? template.variablesSchema
          : fromCatalog.variablesSchema,
    };
  }

  return {
    ...fromCatalog,
    id: template.id,
    isActive: template.isActive,
    isArchived: template.isArchived,
    version: template.version,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
    lastEditedBy: template.lastEditedBy ?? null,
  };
}

function mergeWithRegistry(dbTemplates: CommunicationTemplate[]): CommunicationTemplate[] {
  const bySlug = new Map<string, CommunicationTemplate>();
  for (const entry of COMMUNICATION_TEMPLATE_REGISTRY) {
    bySlug.set(entry.slug, entry);
  }
  for (const row of dbTemplates) {
    bySlug.set(row.slug, enrichFromCatalog(row));
  }
  return [...bySlug.values()].sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });
}

export const communicationRepository = {
  async getTemplateBySlug(
    slug: string,
    options?: { includeInactive?: boolean }
  ): Promise<CommunicationTemplate | null> {
    const db = createAdminClient();
    let query = db.from("communication_templates").select("*").eq("slug", slug);
    if (!options?.includeInactive) {
      query = query.eq("is_active", true).eq("is_archived", false);
    }

    const { data, error } = await query.maybeSingle();

    if (error?.code === "42P01" || error?.code === "PGRST205" || error?.message?.includes("communication_templates")) {
      return getRegistryTemplate(slug) ?? null;
    }

    if (data) return enrichFromCatalog(mapTemplate(data as TemplateRow));
    return getRegistryTemplate(slug) ?? null;
  },

  async listTemplates(options?: { includeArchived?: boolean }): Promise<CommunicationTemplate[]> {
    const db = createAdminClient();
    let query = db.from("communication_templates").select("*").order("category").order("name");
    if (!options?.includeArchived) {
      query = query.eq("is_archived", false);
    }

    const { data, error } = await query;

    if (error?.code === "42P01" || error?.code === "PGRST205" || error?.message?.includes("communication_templates") || !data?.length) {
      return COMMUNICATION_TEMPLATE_REGISTRY.filter((t) => options?.includeArchived || !t.isArchived);
    }
    if (error || !data) return COMMUNICATION_TEMPLATE_REGISTRY;
    return mergeWithRegistry((data as TemplateRow[]).map(mapTemplate)).filter(
      (t) => options?.includeArchived || !t.isArchived
    );
  },

  async getRecipientEmail(userId: string): Promise<string | null> {
    const db = createAdminClient();
    const { data } = await db
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();

    return (data as { email?: string } | null)?.email ?? null;
  },

  async createCommunication(input: {
    recipientUserId: string;
    templateId: string | null;
    templateSlug: string;
    category: CommunicationCategory;
    priority: CommunicationPriority;
    variables: Record<string, unknown>;
    renderedSubject: string | null;
    renderedBody: string;
    renderedInAppTitle: string | null;
    renderedInAppBody: string | null;
    metadata?: Record<string, unknown>;
    relatedEntityType?: string;
    relatedEntityId?: string;
    triggeredBy?: string | null;
  }): Promise<string> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("communications")
      .insert({
        recipient_user_id: input.recipientUserId,
        template_id: input.templateId,
        template_slug: input.templateSlug,
        category: input.category,
        priority: input.priority,
        status: "queued",
        variables: input.variables,
        rendered_subject: input.renderedSubject,
        rendered_body: input.renderedBody,
        rendered_in_app_title: input.renderedInAppTitle,
        rendered_in_app_body: input.renderedInAppBody,
        metadata: input.metadata ?? null,
        related_entity_type: input.relatedEntityType ?? null,
        related_entity_id: input.relatedEntityId ?? null,
        triggered_by: input.triggeredBy ?? null,
      } as never)
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Could not create communication record.");
    }

    return (data as { id: string }).id;
  },

  async updateCommunicationStatus(
    communicationId: string,
    status: CommunicationStatus,
    errorSummary?: string
  ): Promise<void> {
    const db = createAdminClient();
    await db
      .from("communications")
      .update({
        status,
        error_summary: errorSummary ?? null,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", communicationId);
  },

  async createDelivery(input: {
    communicationId: string;
    channel: CommunicationChannel;
    recipientAddress?: string | null;
    status?: CommunicationStatus;
  }): Promise<string> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("communication_deliveries")
      .insert({
        communication_id: input.communicationId,
        channel: input.channel,
        status: input.status ?? "queued",
        recipient_address: input.recipientAddress ?? null,
      } as never)
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Could not create delivery record.");
    }

    return (data as { id: string }).id;
  },

  async updateDelivery(
    deliveryId: string,
    patch: {
      status?: CommunicationStatus;
      notificationId?: string;
      externalId?: string;
      errorMessage?: string;
      sentAt?: string;
      deliveredAt?: string;
      retryCount?: number;
      nextRetryAt?: string | null;
    }
  ): Promise<void> {
    const db = createAdminClient();
    await db
      .from("communication_deliveries")
      .update({
        status: patch.status,
        notification_id: patch.notificationId,
        external_id: patch.externalId,
        error_message: patch.errorMessage,
        sent_at: patch.sentAt,
        delivered_at: patch.deliveredAt,
        retry_count: patch.retryCount,
        next_retry_at: patch.nextRetryAt,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", deliveryId);
  },

  async isChannelEnabled(
    userId: string,
    category: CommunicationCategory,
    channel: CommunicationChannel
  ): Promise<boolean> {
    const db = createAdminClient();
    const { data } = await db
      .from("communication_preferences")
      .select("enabled")
      .eq("user_id", userId)
      .eq("category", category)
      .eq("channel", channel)
      .maybeSingle();

    if (!data) return true;
    return (data as { enabled: boolean }).enabled;
  },

  async listRecentHistory(limit = 50) {
    const db = createAdminClient();
    const { data, error } = await db
      .from("communications")
      .select(
        `
        id,
        recipient_user_id,
        template_slug,
        category,
        priority,
        status,
        rendered_subject,
        rendered_body,
        related_entity_type,
        related_entity_id,
        created_at,
        communication_deliveries (
          id,
          channel,
          status,
          error_message,
          sent_at
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data;
  },

  async listFailedDeliveries(limit = 50) {
    const db = createAdminClient();
    const { data, error } = await db
      .from("communication_deliveries")
      .select(
        `
        id,
        channel,
        status,
        error_message,
        retry_count,
        max_retries,
        next_retry_at,
        communication_id,
        communications (
          id,
          template_slug,
          category,
          recipient_user_id,
          created_at
        )
      `
      )
      .eq("status", "failed")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data;
  },
};
