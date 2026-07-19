import { createHmac, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { PLATFORM_EVENT_AUDIT_ACTIONS } from "@/constants/platform-events";
import type { PlatformEvent, WebhookDelivery, WebhookRegistration } from "@/domain/platform-events/types";
import { auditService } from "@/services/audit.service";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5 * 60 * 1000;

type WebhookRow = {
  id: string;
  name: string;
  url: string;
  secret: string;
  event_type_pattern: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type DeliveryRow = {
  id: string;
  webhook_id: string;
  platform_event_id: string | null;
  payload: Record<string, unknown>;
  signature: string | null;
  status: WebhookDelivery["status"];
  http_status: number | null;
  response_body: string | null;
  retry_count: number;
  next_retry_at: string | null;
  delivered_at: string | null;
  error_message: string | null;
  created_at: string;
};

function mapWebhook(row: WebhookRow): WebhookRegistration {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    secret: row.secret,
    eventTypePattern: row.event_type_pattern,
    isActive: row.is_active,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDelivery(row: DeliveryRow): WebhookDelivery {
  return {
    id: row.id,
    webhookId: row.webhook_id,
    platformEventId: row.platform_event_id,
    payload: row.payload ?? {},
    signature: row.signature,
    status: row.status,
    httpStatus: row.http_status,
    responseBody: row.response_body,
    retryCount: row.retry_count,
    nextRetryAt: row.next_retry_at,
    deliveredAt: row.delivered_at,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  };
}

function matchesPattern(eventType: string, pattern: string): boolean {
  if (pattern === "*") return true;
  if (pattern.endsWith("*")) {
    return eventType.startsWith(pattern.slice(0, -1));
  }
  return eventType === pattern;
}

export function generateWebhookSignature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export const webhookService = {
  async register(input: {
    name: string;
    url: string;
    eventTypePattern?: string;
    actorId: string;
  }): Promise<WebhookRegistration> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const secret = randomBytes(32).toString("hex");
    const db = createAdminClient();

    const { data, error } = await db
      .from("webhook_registrations")
      .insert({
        name: input.name.trim(),
        url: input.url.trim(),
        secret,
        event_type_pattern: input.eventTypePattern ?? "*",
        is_active: true,
        created_by: input.actorId,
      } as never)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const webhook = mapWebhook(data as WebhookRow);

    await auditService.log({
      actorId: input.actorId,
      action: PLATFORM_EVENT_AUDIT_ACTIONS.WEBHOOK_REGISTERED,
      entityType: "webhook_registration",
      entityId: webhook.id,
      newValues: { name: webhook.name, url: webhook.url },
    });

    return webhook;
  },

  async list(): Promise<WebhookRegistration[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data, error } = await db
      .from("webhook_registrations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return ((data ?? []) as WebhookRow[]).map(mapWebhook);
  },

  async toggleActive(webhookId: string, isActive: boolean, actorId: string): Promise<void> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    await db.from("webhook_registrations").update({ is_active: isActive } as never).eq("id", webhookId);

    await auditService.log({
      actorId,
      action: PLATFORM_EVENT_AUDIT_ACTIONS.WEBHOOK_REGISTERED,
      entityType: "webhook_registration",
      entityId: webhookId,
      newValues: { isActive },
    });
  },

  async enqueueForEvent(event: PlatformEvent): Promise<void> {
    const db = createAdminClient();
    const { data: webhooks } = await db
      .from("webhook_registrations")
      .select("*")
      .eq("is_active", true);

    for (const row of (webhooks ?? []) as WebhookRow[]) {
      if (!matchesPattern(event.eventType, row.event_type_pattern)) continue;

      const payload = {
        eventId: event.id,
        eventType: event.eventType,
        category: event.category,
        entityType: event.entityType,
        entityId: event.entityId,
        severity: event.severity,
        payload: event.payload,
        createdAt: event.createdAt,
      };
      const body = JSON.stringify(payload);
      const signature = generateWebhookSignature(body, row.secret);

      await db.from("webhook_deliveries").insert({
        webhook_id: row.id,
        platform_event_id: event.id,
        payload,
        signature,
        status: "pending",
      } as never);
    }
  },

  async processPending(limit = 10): Promise<{ delivered: number; failed: number }> {
    const db = createAdminClient();
    const now = new Date().toISOString();

    const { data: deliveries } = await db
      .from("webhook_deliveries")
      .select("*")
      .in("status", ["pending", "failed"])
      .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
      .order("created_at", { ascending: true })
      .limit(limit);

    let delivered = 0;
    let failed = 0;

    for (const row of (deliveries ?? []) as DeliveryRow[]) {
      const { data: webhookRow } = await db
        .from("webhook_registrations")
        .select("url, secret")
        .eq("id", row.webhook_id)
        .maybeSingle();

      const webhook = webhookRow as { url: string; secret: string } | null;
      if (!webhook) continue;

      try {
        await db.from("webhook_deliveries").update({ status: "processing" } as never).eq("id", row.id);

        const body = JSON.stringify(row.payload);
        const response = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-RyvonX-Signature": row.signature ?? generateWebhookSignature(body, webhook.secret),
            "X-RyvonX-Event-Id": row.platform_event_id ?? row.id,
          },
          body,
          signal: AbortSignal.timeout(10000),
        });

        const responseBody = await response.text().catch(() => "");

        if (response.ok) {
          await db
            .from("webhook_deliveries")
            .update({
              status: "delivered",
              http_status: response.status,
              response_body: responseBody.slice(0, 2000),
              delivered_at: new Date().toISOString(),
            } as never)
            .eq("id", row.id);

          await auditService.log({
            action: PLATFORM_EVENT_AUDIT_ACTIONS.WEBHOOK_DELIVERED,
            entityType: "webhook_delivery",
            entityId: row.id,
            newValues: { httpStatus: response.status },
          });

          delivered++;
        } else {
          throw new Error(`HTTP ${response.status}: ${responseBody.slice(0, 200)}`);
        }
      } catch (err) {
        failed++;
        const retryCount = row.retry_count + 1;
        const message = err instanceof Error ? err.message : "Delivery failed";

        if (retryCount >= MAX_RETRIES) {
          await db
            .from("webhook_deliveries")
            .update({
              status: "failed",
              retry_count: retryCount,
              error_message: message,
            } as never)
            .eq("id", row.id);

          await auditService.log({
            action: PLATFORM_EVENT_AUDIT_ACTIONS.WEBHOOK_FAILED,
            entityType: "webhook_delivery",
            entityId: row.id,
            newValues: { errorMessage: message },
          });
        } else {
          await db
            .from("webhook_deliveries")
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

    return { delivered, failed };
  },

  async listFailedDeliveries(limit = 20): Promise<WebhookDelivery[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data, error } = await db
      .from("webhook_deliveries")
      .select("*")
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return ((data ?? []) as DeliveryRow[]).map(mapDelivery);
  },

  async countPending(): Promise<number> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { count } = await db
      .from("webhook_deliveries")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "processing", "failed"]);
    return count ?? 0;
  },
};
