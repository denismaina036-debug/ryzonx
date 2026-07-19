import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/authorization";
import { auditService } from "@/services/audit.service";
import type { UserRole } from "@/constants/roles";

export interface AdminUserRecord {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  isActive: boolean;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export const userAdminService = {
  async list(options?: {
    search?: string;
    role?: UserRole;
    limit?: number;
    offset?: number;
  }): Promise<{ users: AdminUserRecord[]; total: number }> {
    await requirePermission("VIEW_ALL_USER_DATA");
    const db = createAdminClient();
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    let query = db
      .from("profiles")
      .select("id, email, full_name, role, is_active, phone, created_at, updated_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (options?.role) query = query.eq("role", options.role);
    if (options?.search) {
      const q = `%${options.search}%`;
      query = query.or(`email.ilike.${q},full_name.ilike.${q}`);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    const users = ((data ?? []) as Array<{
      id: string;
      email: string;
      full_name: string | null;
      role: UserRole;
      is_active: boolean;
      phone: string | null;
      created_at: string;
      updated_at: string;
    }>).map((row) => ({
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      isActive: row.is_active,
      phone: row.phone,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return { users, total: count ?? users.length };
  },

  async update(
    userId: string,
    patch: { role?: UserRole; isActive?: boolean },
    actorId: string
  ): Promise<AdminUserRecord> {
    await requirePermission("MANAGE_USERS");
    const db = createAdminClient();

    const { data: existing } = await db
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (!existing) throw new Error("User not found.");

    const updatePayload: Record<string, unknown> = {};
    if (patch.role !== undefined) updatePayload.role = patch.role;
    if (patch.isActive !== undefined) updatePayload.is_active = patch.isActive;

    const { data, error } = await db
      .from("profiles")
      .update(updatePayload as never)
      .eq("id", userId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const row = data as {
      id: string;
      email: string;
      full_name: string | null;
      role: UserRole;
      is_active: boolean;
      phone: string | null;
      created_at: string;
      updated_at: string;
    };

    await auditService.log({
      actorId,
      action: "user_admin_updated",
      entityType: "profile",
      entityId: userId,
      oldValues: {
        role: (existing as { role: UserRole }).role,
        isActive: (existing as { is_active: boolean }).is_active,
      },
      newValues: updatePayload,
    });

    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      isActive: row.is_active,
      phone: row.phone,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },
};
