import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/session";

export interface UserTimelineEntry {
  id: string;
  source: "notification" | "communication";
  category: string;
  priority: string;
  title: string;
  body: string;
  status: string;
  isRead: boolean;
  actionUrl: string | null;
  actionLabel: string | null;
  createdAt: string;
  templateSlug: string | null;
}

export const communicationTimelineService = {
  async getUserTimeline(limit = 100): Promise<UserTimelineEntry[]> {
    const user = await requireAuth();
    const db = createAdminClient();

    const [{ data: notifications }, { data: communications }] = await Promise.all([
      db
        .from("notifications")
        .select("id, type, title, message, is_read, metadata, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit),
      db
        .from("communications")
        .select(
          "id, template_slug, category, priority, status, rendered_subject, rendered_in_app_title, rendered_in_app_body, rendered_body, metadata, created_at"
        )
        .eq("recipient_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);

    const fromNotifications: UserTimelineEntry[] = (
      (notifications ?? []) as Array<{
        id: string;
        type: string;
        title: string;
        message: string;
        is_read: boolean;
        metadata: Record<string, unknown> | null;
        created_at: string;
      }>
    ).map((n) => ({
      id: n.id,
      source: "notification",
      category: String(n.metadata?.category ?? n.type),
      priority: String(n.metadata?.priority ?? "normal"),
      title: n.title,
      body: n.message,
      status: n.is_read ? "read" : "unread",
      isRead: n.is_read,
      actionUrl: (n.metadata?.action_url as string | undefined) ?? null,
      actionLabel: (n.metadata?.action_label as string | undefined) ?? null,
      createdAt: n.created_at,
      templateSlug: null,
    }));

    const fromComms: UserTimelineEntry[] = (
      (communications ?? []) as Array<{
        id: string;
        template_slug: string | null;
        category: string;
        priority: string;
        status: string;
        rendered_subject: string | null;
        rendered_in_app_title: string | null;
        rendered_in_app_body: string | null;
        rendered_body: string | null;
        metadata: Record<string, unknown> | null;
        created_at: string;
      }>
    ).map((c) => ({
      id: c.id,
      source: "communication",
      category: c.category,
      priority: c.priority,
      title: c.rendered_in_app_title ?? c.rendered_subject ?? "RyvonX",
      body: c.rendered_in_app_body ?? c.rendered_body ?? "",
      status: c.status,
      isRead: true,
      actionUrl: (c.metadata?.action_url as string | undefined) ?? null,
      actionLabel: (c.metadata?.action_label as string | undefined) ?? null,
      createdAt: c.created_at,
      templateSlug: c.template_slug,
    }));

    return [...fromNotifications, ...fromComms]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  },
};
