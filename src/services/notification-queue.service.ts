import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { PLATFORM_EVENT_AUDIT_ACTIONS } from "@/constants/platform-events";
import type { CommunicationCategory, CommunicationChannel, CommunicationPriority } from "@/domain/communication/types";
import type { NotificationHistoryRecord, NotificationQueueItem } from "@/domain/platform-events/types";
import { auditService } from "@/services/audit.service";
import { communicationTriggers } from "@/services/communication/communication-triggers.service";
import { emailQueueService } from "@/services/communication/email/email-queue.service";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5 * 60 * 1000;

type QueueRow = {
  id: string;
  platform_event_id: string | null;
  recipient_user_id: string;
  template_slug: string;
  channels: string[];
  category: CommunicationCategory;
  priority: CommunicationPriority;
  variables: Record<string, unknown>;
  metadata: Record<string, unknown>;
  status: NotificationQueueItem["status"];
  retry_count: number;
  next_retry_at: string | null;
  processed_at: string | null;
  error_message: string | null;
  created_at: string;
};

type HistoryRow = {
  id: string;
  notification_queue_id: string | null;
  platform_event_id: string | null;
  recipient_user_id: string;
  channel: string;
  template_slug: string;
  title: string;
  body: string;
  status: string;
  communication_id: string | null;
  metadata: Record<string, unknown>;
  delivered_at: string;
  created_at: string;
};

function mapQueue(row: QueueRow): NotificationQueueItem {
  return {
    id: row.id,
    platformEventId: row.platform_event_id,
    recipientUserId: row.recipient_user_id,
    templateSlug: row.template_slug,
    channels: row.channels ?? ["in_app"],
    category: row.category,
    priority: row.priority,
    variables: row.variables ?? {},
    metadata: row.metadata ?? {},
    status: row.status,
    retryCount: row.retry_count,
    nextRetryAt: row.next_retry_at,
    processedAt: row.processed_at,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  };
}

function mapHistory(row: HistoryRow): NotificationHistoryRecord {
  return {
    id: row.id,
    notificationQueueId: row.notification_queue_id,
    platformEventId: row.platform_event_id,
    recipientUserId: row.recipient_user_id,
    channel: row.channel,
    templateSlug: row.template_slug,
    title: row.title,
    body: row.body,
    status: row.status,
    communicationId: row.communication_id,
    metadata: row.metadata ?? {},
    deliveredAt: row.delivered_at,
    createdAt: row.created_at,
  };
}

export const notificationQueueService = {
  async enqueue(input: {
    platformEventId?: string;
    recipientUserId: string;
    templateSlug: string;
    channels?: CommunicationChannel[];
    category?: CommunicationCategory;
    priority?: CommunicationPriority;
    variables?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): Promise<NotificationQueueItem> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("notification_queue")
      .insert({
        platform_event_id: input.platformEventId ?? null,
        recipient_user_id: input.recipientUserId,
        template_slug: input.templateSlug,
        channels: input.channels ?? ["in_app"],
        category: input.category ?? "system",
        priority: input.priority ?? "normal",
        variables: input.variables ?? {},
        metadata: input.metadata ?? {},
        status: "pending",
      } as never)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    await auditService.log({
      action: PLATFORM_EVENT_AUDIT_ACTIONS.NOTIFICATION_QUEUED,
      entityType: "notification_queue",
      entityId: (data as QueueRow).id,
      newValues: {
        templateSlug: input.templateSlug,
        recipientUserId: input.recipientUserId,
      },
    });

    return mapQueue(data as QueueRow);
  },

  async processPending(limit = 25): Promise<{ processed: number; failed: number }> {
    const db = createAdminClient();
    const now = new Date().toISOString();

    const { data: items } = await db
      .from("notification_queue")
      .select("*")
      .in("status", ["pending", "failed"])
      .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
      .order("created_at", { ascending: true })
      .limit(limit);

    let processed = 0;
    let failed = 0;

    for (const row of (items ?? []) as QueueRow[]) {
      try {
        await db
          .from("notification_queue")
          .update({ status: "processing" } as never)
          .eq("id", row.id);

        const stringVars: Record<string, string | number | boolean | null | undefined> = {};
        for (const [k, v] of Object.entries(row.variables ?? {})) {
          if (typeof v === "object" && v !== null) stringVars[k] = JSON.stringify(v);
          else stringVars[k] = v as string | number | boolean | null | undefined;
        }

        await communicationTriggers.notify({
          templateSlug: row.template_slug,
          recipientUserId: row.recipient_user_id,
          variables: stringVars,
          category: row.category,
          priority: row.priority,
          channels: (row.channels ?? ["in_app"]) as CommunicationChannel[],
          metadata: row.metadata ?? {},
          relatedEntityType: typeof row.metadata?.entityType === "string" ? row.metadata.entityType : undefined,
          relatedEntityId: typeof row.metadata?.entityId === "string" ? row.metadata.entityId : undefined,
        });

        await db
          .from("notification_queue")
          .update({
            status: "sent",
            processed_at: new Date().toISOString(),
            error_message: null,
          } as never)
          .eq("id", row.id);

        await db.from("notification_history").insert({
          notification_queue_id: row.id,
          platform_event_id: row.platform_event_id,
          recipient_user_id: row.recipient_user_id,
          channel: (row.channels ?? ["in_app"]).join(","),
          template_slug: row.template_slug,
          title: row.template_slug,
          body: row.template_slug,
          status: "delivered",
          metadata: row.metadata ?? {},
        } as never);

        await auditService.log({
          action: PLATFORM_EVENT_AUDIT_ACTIONS.NOTIFICATION_SENT,
          entityType: "notification_queue",
          entityId: row.id,
          newValues: { templateSlug: row.template_slug },
        });

        processed++;
      } catch (err) {
        failed++;
        const retryCount = row.retry_count + 1;
        const message = err instanceof Error ? err.message : "Send failed";

        if (retryCount >= MAX_RETRIES) {
          await db
            .from("notification_queue")
            .update({
              status: "failed",
              retry_count: retryCount,
              error_message: message,
              processed_at: new Date().toISOString(),
            } as never)
            .eq("id", row.id);
        } else {
          await db
            .from("notification_queue")
            .update({
              status: "failed",
              retry_count: retryCount,
              next_retry_at: new Date(Date.now() + RETRY_DELAY_MS).toISOString(),
              error_message: message,
            } as never)
            .eq("id", row.id);
        }
      }
    }

    if (processed > 0) {
      void emailQueueService.processPending(25).catch(() => undefined);
    }

    return { processed, failed };
  },

  async listPending(limit = 50): Promise<NotificationQueueItem[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data, error } = await db
      .from("notification_queue")
      .select("*")
      .in("status", ["pending", "processing", "failed"])
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return ((data ?? []) as QueueRow[]).map(mapQueue);
  },

  async getHistoryForUser(userId: string, limit = 50): Promise<NotificationHistoryRecord[]> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("notification_history")
      .select("*")
      .eq("recipient_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return ((data ?? []) as HistoryRow[]).map(mapHistory);
  },

  async countByStatus(): Promise<{ pending: number; failed: number }> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const [{ count: pending }, { count: failed }] = await Promise.all([
      db.from("notification_queue").select("*", { count: "exact", head: true }).eq("status", "pending"),
      db.from("notification_queue").select("*", { count: "exact", head: true }).eq("status", "failed"),
    ]);
    return { pending: pending ?? 0, failed: failed ?? 0 };
  },

  async retryFailed(queueId: string): Promise<void> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { error } = await db
      .from("notification_queue")
      .update({
        status: "pending",
        retry_count: 0,
        next_retry_at: null,
        error_message: null,
      } as never)
      .eq("id", queueId)
      .eq("status", "failed");

    if (error) throw new Error(error.message);
  },
};
