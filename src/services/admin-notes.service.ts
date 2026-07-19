import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { auditService } from "@/services/audit.service";

export interface AdminInternalNote {
  id: string;
  entityType: string;
  entityId: string;
  note: string;
  actorId: string;
  actorName: string;
  createdAt: string;
}

const NOTE_ACTION = "admin_internal_note";

export const adminNotesService = {
  async addNote(input: {
    entityType: string;
    entityId: string;
    note: string;
  }): Promise<AdminInternalNote> {
    const user = await requireRole(USER_ROLES.ADMINISTRATOR);
    const trimmed = input.note.trim();
    if (!trimmed) throw new Error("Note cannot be empty.");

    await auditService.log({
      actorId: user.id,
      action: NOTE_ACTION,
      entityType: input.entityType,
      entityId: input.entityId,
      newValues: { note: trimmed, visibility: "admin_only" },
    });

    const db = createAdminClient();
    const { data } = await db
      .from("audit_logs")
      .select("id, created_at")
      .eq("entity_type", input.entityType)
      .eq("entity_id", input.entityId)
      .eq("action", NOTE_ACTION)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      id: (data as { id: string } | null)?.id ?? crypto.randomUUID(),
      entityType: input.entityType,
      entityId: input.entityId,
      note: trimmed,
      actorId: user.id,
      actorName: user.fullName ?? user.email ?? "Administrator",
      createdAt: (data as { created_at?: string } | null)?.created_at ?? new Date().toISOString(),
    };
  },

  async listNotes(entityType: string, entityId: string): Promise<AdminInternalNote[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const { data, error } = await db
      .from("audit_logs")
      .select(
        "id, actor_id, entity_type, entity_id, new_values, created_at, profiles(full_name, email)"
      )
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .eq("action", NOTE_ACTION)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error || !data) return [];

    return (data as Array<Record<string, unknown>>).map((row) => {
      const profile = row.profiles as { full_name?: string; email?: string } | null;
      const newValues = row.new_values as { note?: string } | null;
      return {
        id: row.id as string,
        entityType: row.entity_type as string,
        entityId: row.entity_id as string,
        note: newValues?.note ?? "",
        actorId: row.actor_id as string,
        actorName: profile?.full_name ?? profile?.email ?? "Administrator",
        createdAt: row.created_at as string,
      };
    });
  },
};
