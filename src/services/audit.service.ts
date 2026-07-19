import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import type { AuditLogEntry } from "@/features/admin/types";

type AuditRow = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  profiles?: { full_name: string | null; email: string | null } | null;
};

function mapAuditLog(row: AuditRow): AuditLogEntry {
  const profile = row.profiles;
  const summaryParts = [
    row.action.replace(/_/g, " "),
    row.entity_id ? `(${row.entity_type} ${row.entity_id.slice(0, 8)}…)` : row.entity_type,
  ];
  return {
    id: row.id,
    actorName: profile?.full_name ?? profile?.email ?? "System",
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id ?? null,
    summary: summaryParts.join(" — "),
    createdAt: row.created_at,
  };
}

export const auditService = {
  async log(input: {
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    oldValues?: Record<string, unknown> | null;
    newValues?: Record<string, unknown> | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    const db = createAdminClient();
    await db.from("audit_logs").insert({
      actor_id: input.actorId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      old_values: input.oldValues ?? null,
      new_values: input.newValues ?? null,
      ip_address: input.ipAddress ?? null,
      user_agent: input.userAgent ?? null,
    } as never);
  },

  async listRecent(limit = 100): Promise<AuditLogEntry[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const { data, error } = await db
      .from("audit_logs")
      .select(
        "id, actor_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, created_at, profiles(full_name, email)"
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return (data as AuditRow[]).map(mapAuditLog);
  },

  async listByEntity(entityType: string, entityId: string, limit = 50): Promise<AuditLogEntry[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const { data, error } = await db
      .from("audit_logs")
      .select(
        "id, actor_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, created_at, profiles(full_name, email)"
      )
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return (data as AuditRow[]).map(mapAuditLog);
  },
};
