import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { auditService } from "@/services/audit.service";
import { COMMUNICATION_AUDIT_ACTIONS, COMMUNICATION_ENTITY_TYPE } from "@/constants/communication";

export interface BroadcastRecord {
  id: string;
  name: string;
  templateSlug: string | null;
  category: string;
  status: string;
  audienceFilter: Record<string, unknown>;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  deliveryStats: Record<string, unknown>;
}

function mapBroadcast(row: Record<string, unknown>): BroadcastRecord {
  return {
    id: row.id as string,
    name: row.name as string,
    templateSlug: (row.template_slug as string | null) ?? null,
    category: row.category as string,
    status: row.status as string,
    audienceFilter: (row.audience_filter as Record<string, unknown>) ?? {},
    scheduledAt: (row.scheduled_at as string | null) ?? null,
    startedAt: (row.started_at as string | null) ?? null,
    completedAt: (row.completed_at as string | null) ?? null,
    createdAt: row.created_at as string,
    deliveryStats: (row.delivery_stats as Record<string, unknown>) ?? {},
  };
}

export const broadcastCenterService = {
  async list(): Promise<BroadcastRecord[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data } = await db
      .from("broadcast_campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    return ((data ?? []) as Array<Record<string, unknown>>).map(mapBroadcast);
  },

  async create(input: {
    name: string;
    templateSlug?: string;
    category?: string;
    audienceFilter?: Record<string, unknown>;
    scheduledAt?: string | null;
  }): Promise<BroadcastRecord> {
    const admin = await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const { data, error } = await db
      .from("broadcast_campaigns")
      .insert({
        name: input.name.trim(),
        template_slug: input.templateSlug ?? "announcement_broadcast",
        category: input.category ?? "announcements",
        status: input.scheduledAt ? "queued" : "draft",
        audience_filter: input.audienceFilter ?? { audience: "everyone" },
        scheduled_at: input.scheduledAt ?? null,
        created_by: admin.id,
      } as never)
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Could not create broadcast");

    await auditService.log({
      actorId: admin.id,
      action: COMMUNICATION_AUDIT_ACTIONS.BROADCAST_SCHEDULED,
      entityType: COMMUNICATION_ENTITY_TYPE,
      entityId: (data as { id: string }).id,
      newValues: { name: input.name, scheduled: Boolean(input.scheduledAt) },
    });

    return mapBroadcast(data as Record<string, unknown>);
  },

  async duplicate(id: string): Promise<BroadcastRecord> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data: source } = await db.from("broadcast_campaigns").select("*").eq("id", id).maybeSingle();
    if (!source) throw new Error("Broadcast not found");
    const row = source as Record<string, unknown>;
    return this.create({
      name: `${row.name as string} (Copy)`,
      templateSlug: (row.template_slug as string | null) ?? undefined,
      category: row.category as string,
      audienceFilter: row.audience_filter as Record<string, unknown>,
    });
  },
};

/** Campaigns share broadcast infrastructure — future automation hooks. */
export const campaignCenterService = {
  async list(): Promise<BroadcastRecord[]> {
    const all = await broadcastCenterService.list();
    return all.filter((b) => Boolean((b.audienceFilter as { campaign?: boolean }).campaign));
  },
  create: (input: {
    name: string;
    templateSlug?: string;
    scheduledAt?: string | null;
    audienceFilter?: Record<string, unknown>;
  }) =>
    broadcastCenterService.create({
      ...input,
      category: "marketing",
      audienceFilter: { ...input.audienceFilter, campaign: true },
    }),
};
