import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { PLATFORM_EVENT_AUDIT_ACTIONS } from "@/constants/platform-events";
import type {
  PlatformEventCategory,
  PlatformEventSeverity,
  PlatformEventStatus,
} from "@/constants/platform-events";
import type { PlatformEvent, PublishPlatformEventInput } from "@/domain/platform-events/types";
import { auditService } from "@/services/audit.service";

type EventRow = {
  id: string;
  event_type: string;
  category: PlatformEventCategory;
  entity_type: string | null;
  entity_id: string | null;
  actor_id: string | null;
  correlation_id: string | null;
  severity: PlatformEventSeverity;
  payload: Record<string, unknown>;
  status: PlatformEventStatus;
  processed_at: string | null;
  error_message: string | null;
  created_at: string;
};

function mapEvent(row: EventRow): PlatformEvent {
  return {
    id: row.id,
    eventType: row.event_type,
    category: row.category,
    entityType: row.entity_type,
    entityId: row.entity_id,
    actorId: row.actor_id,
    correlationId: row.correlation_id,
    severity: row.severity,
    payload: row.payload ?? {},
    status: row.status,
    processedAt: row.processed_at,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  };
}

export const platformEventService = {
  async create(input: PublishPlatformEventInput): Promise<PlatformEvent> {
    const db = createAdminClient();
    const correlationId = input.correlationId ?? randomUUID();

    const { data, error } = await db
      .from("platform_events")
      .insert({
        event_type: input.eventType,
        category: input.category ?? "system",
        entity_type: input.entityType ?? null,
        entity_id: input.entityId ?? null,
        actor_id: input.actorId ?? null,
        correlation_id: correlationId,
        severity: input.severity ?? "info",
        payload: input.payload ?? {},
        status: "pending",
      } as never)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const event = mapEvent(data as EventRow);

    await auditService.log({
      actorId: input.actorId ?? null,
      action: PLATFORM_EVENT_AUDIT_ACTIONS.EVENT_PUBLISHED,
      entityType: "platform_event",
      entityId: event.id,
      newValues: {
        eventType: event.eventType,
        category: event.category,
        entityType: event.entityType,
        entityId: event.entityId,
      },
    });

    return event;
  },

  async markProcessed(eventId: string): Promise<void> {
    const db = createAdminClient();
    await db
      .from("platform_events")
      .update({
        status: "processed",
        processed_at: new Date().toISOString(),
        error_message: null,
      } as never)
      .eq("id", eventId);
  },

  async markFailed(eventId: string, errorMessage: string): Promise<void> {
    const db = createAdminClient();
    await db
      .from("platform_events")
      .update({
        status: "failed",
        processed_at: new Date().toISOString(),
        error_message: errorMessage,
      } as never)
      .eq("id", eventId);

    await auditService.log({
      action: PLATFORM_EVENT_AUDIT_ACTIONS.EVENT_FAILED,
      entityType: "platform_event",
      entityId: eventId,
      newValues: { errorMessage },
    });
  },

  async getById(eventId: string): Promise<PlatformEvent | null> {
    const db = createAdminClient();
    const { data } = await db.from("platform_events").select("*").eq("id", eventId).maybeSingle();
    return data ? mapEvent(data as EventRow) : null;
  },

  async listRecent(limit = 50): Promise<PlatformEvent[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data, error } = await db
      .from("platform_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return ((data ?? []) as EventRow[]).map(mapEvent);
  },

  async listFiltered(filters: {
    eventType?: string;
    category?: PlatformEventCategory;
    status?: PlatformEventStatus;
    entityType?: string;
    entityId?: string;
    limit?: number;
    offset?: number;
  }): Promise<PlatformEvent[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    let query = db.from("platform_events").select("*").order("created_at", { ascending: false });

    if (filters.eventType) query = query.eq("event_type", filters.eventType);
    if (filters.category) query = query.eq("category", filters.category);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.entityType) query = query.eq("entity_type", filters.entityType);
    if (filters.entityId) query = query.eq("entity_id", filters.entityId);

    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return ((data ?? []) as EventRow[]).map(mapEvent);
  },
};
