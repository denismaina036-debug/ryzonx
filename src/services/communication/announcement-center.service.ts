import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { DEFAULT_FUND_ID } from "@/constants/funds";
import { auditService } from "@/services/audit.service";
import { COMMUNICATION_AUDIT_ACTIONS, COMMUNICATION_ENTITY_TYPE } from "@/constants/communication";
import { communicationTriggers } from "@/services/communication/communication-triggers.service";

export interface AnnouncementRecord {
  id: string;
  title: string;
  content: string;
  preview: string | null;
  status: string;
  category: string;
  priority: string;
  isPublished: boolean;
  publishedAt: string | null;
  scheduledAt: string | null;
  archivedAt: string | null;
  sendEmail: boolean;
  createdAt: string;
  updatedAt: string;
}

function mapAnnouncement(row: Record<string, unknown>): AnnouncementRecord {
  return {
    id: row.id as string,
    title: row.title as string,
    content: row.content as string,
    preview: (row.preview as string | null) ?? null,
    status: (row.status as string) ?? "draft",
    category: (row.category as string) ?? "platform_update",
    priority: (row.priority as string) ?? "normal",
    isPublished: Boolean(row.is_published),
    publishedAt: (row.published_at as string | null) ?? null,
    scheduledAt: (row.scheduled_at as string | null) ?? null,
    archivedAt: (row.archived_at as string | null) ?? null,
    sendEmail: Boolean(row.send_email),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export const announcementCenterService = {
  async list(): Promise<AnnouncementRecord[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data } = await db
      .from("announcements")
      .select("*")
      .order("updated_at", { ascending: false });
    return ((data ?? []) as Array<Record<string, unknown>>).map(mapAnnouncement);
  },

  async create(input: {
    title: string;
    content: string;
    preview?: string;
    category?: string;
    priority?: string;
    scheduledAt?: string | null;
    sendEmail?: boolean;
  }): Promise<AnnouncementRecord> {
    const admin = await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const status = input.scheduledAt ? "scheduled" : "draft";

    const { data, error } = await db
      .from("announcements")
      .insert({
        title: input.title.trim(),
        content: input.content.trim(),
        preview: input.preview?.trim() ?? null,
        category: input.category ?? "platform_update",
        priority: input.priority ?? "normal",
        status,
        scheduled_at: input.scheduledAt ?? null,
        send_email: input.sendEmail ?? false,
        fund_id: DEFAULT_FUND_ID,
        created_by: admin.id,
        is_published: false,
      } as never)
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Could not create announcement");

    await auditService.log({
      actorId: admin.id,
      action: COMMUNICATION_AUDIT_ACTIONS.TEMPLATE_CREATED,
      entityType: COMMUNICATION_ENTITY_TYPE,
      entityId: (data as { id: string }).id,
      newValues: { title: input.title, status },
    });

    return mapAnnouncement(data as Record<string, unknown>);
  },

  async publish(id: string): Promise<void> {
    const admin = await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const now = new Date().toISOString();

    const { data: announcement } = await db
      .from("announcements")
      .select("id, title, content, preview, send_email, priority")
      .eq("id", id)
      .maybeSingle();

    await db
      .from("announcements")
      .update({
        is_published: true,
        status: "published",
        published_at: now,
        updated_at: now,
      } as never)
      .eq("id", id);

    if (announcement && (announcement as { send_email?: boolean }).send_email) {
      const row = announcement as {
        title: string;
        content: string;
        preview: string | null;
        priority: string;
      };
      const { data: recipients } = await db
        .from("profiles")
        .select("id")
        .eq("is_active", true);

      const recipientIds = ((recipients ?? []) as Array<{ id: string }>).map((r) => r.id);
      if (recipientIds.length > 0) {
        await communicationTriggers.notifyMany(recipientIds, {
          templateSlug: "announcement_broadcast",
          variables: {
            announcement_title: row.title,
            announcement_body: row.content,
            announcement_preview: row.preview ?? row.content.slice(0, 120),
          },
          category: "announcements",
          priority: row.priority === "critical" ? "critical" : "normal",
          relatedEntityType: "announcement",
          relatedEntityId: id,
          triggeredBy: admin.id,
        });
      }
    }

    await auditService.log({
      actorId: admin.id,
      action: COMMUNICATION_AUDIT_ACTIONS.BROADCAST_SCHEDULED,
      entityType: COMMUNICATION_ENTITY_TYPE,
      entityId: id,
      newValues: { action: "announcement_published" },
    });
  },

  async archive(id: string): Promise<void> {
    const admin = await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const now = new Date().toISOString();
    await db
      .from("announcements")
      .update({ status: "archived", archived_at: now, is_published: false, updated_at: now } as never)
      .eq("id", id);

    await auditService.log({
      actorId: admin.id,
      action: COMMUNICATION_AUDIT_ACTIONS.TEMPLATE_ARCHIVED,
      entityType: COMMUNICATION_ENTITY_TYPE,
      entityId: id,
      newValues: { action: "announcement_archived" },
    });
  },
};
