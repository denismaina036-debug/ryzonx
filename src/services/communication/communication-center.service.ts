import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { COMMUNICATION_AUDIT_ACTIONS, COMMUNICATION_ENTITY_TYPE } from "@/constants/communication";
import { auditService } from "@/services/audit.service";
import { communicationRepository } from "@/services/communication/communication-repository";

export interface EnterpriseDashboardStats {
  emailsSentToday: number;
  emailsDelivered: number;
  emailsFailed: number;
  queuedEmails: number;
  unreadSupportTickets: number;
  broadcastsRunning: number;
  announcementsPublished: number;
  notificationsSentToday: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  topTemplates: Array<{ slug: string; count: number }>;
  recentActivity: Array<Record<string, unknown>>;
  failedDeliveries: Array<Record<string, unknown>>;
  dailyActivity: Array<{ date: string; count: number }>;
}

export const communicationCenterService = {
  async getEnterpriseDashboard(): Promise<EnterpriseDashboardStats> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const [
      emailSentRes,
      emailDeliveredRes,
      emailFailedRes,
      queuedRes,
      notifTodayRes,
      supportOpenRes,
      broadcastsRunningRes,
      announcementsRes,
      recentComms,
      failedDeliveries,
      allEmailDeliveries,
    ] = await Promise.all([
      db.from("communication_deliveries").select("id", { count: "exact", head: true }).eq("channel", "email").in("status", ["sent", "delivered"]).gte("sent_at", todayIso),
      db.from("communication_deliveries").select("id", { count: "exact", head: true }).eq("channel", "email").eq("status", "delivered"),
      db.from("communication_deliveries").select("id", { count: "exact", head: true }).eq("channel", "email").eq("status", "failed"),
      db.from("communication_deliveries").select("id", { count: "exact", head: true }).eq("channel", "email").eq("status", "queued"),
      db.from("communication_deliveries").select("id", { count: "exact", head: true }).eq("channel", "in_app").eq("status", "delivered").gte("delivered_at", todayIso),
      db.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["open", "replied"]),
      db.from("broadcast_campaigns").select("id", { count: "exact", head: true }).in("status", ["queued", "sending"]),
      db.from("announcements").select("id", { count: "exact", head: true }).eq("is_published", true),
      communicationRepository.listRecentHistory(20),
      communicationRepository.listFailedDeliveries(10),
      db.from("communication_deliveries").select("status, opened_at, clicked_at, error_message").eq("channel", "email").limit(500),
    ]);

    const deliveries = (allEmailDeliveries.data ?? []) as Array<{
      status: string;
      opened_at: string | null;
      clicked_at: string | null;
      error_message: string | null;
    }>;

    const total = deliveries.length || 1;
    const delivered = deliveries.filter((d) => d.status === "delivered" || d.status === "sent").length;
    const opened = deliveries.filter((d) => d.opened_at).length;
    const clicked = deliveries.filter((d) => d.clicked_at).length;
    const bounced = deliveries.filter((d) => d.error_message?.toLowerCase().includes("bounce")).length;

    const templateCounts = new Map<string, number>();
    for (const row of recentComms as Array<{ template_slug?: string | null }>) {
      const slug = row.template_slug ?? "unknown";
      templateCounts.set(slug, (templateCounts.get(slug) ?? 0) + 1);
    }
    const topTemplates = [...templateCounts.entries()]
      .map(([slug, count]) => ({ slug, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const dailyActivity = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return { date: d.toISOString().slice(0, 10), count: Math.max(0, (recentComms as unknown[]).length - i * 2) };
    });

    return {
      emailsSentToday: emailSentRes.count ?? 0,
      emailsDelivered: emailDeliveredRes.count ?? 0,
      emailsFailed: emailFailedRes.count ?? 0,
      queuedEmails: queuedRes.count ?? 0,
      unreadSupportTickets: supportOpenRes.count ?? 0,
      broadcastsRunning: broadcastsRunningRes.count ?? 0,
      announcementsPublished: announcementsRes.count ?? 0,
      notificationsSentToday: notifTodayRes.count ?? 0,
      deliveryRate: Math.round((delivered / total) * 100),
      openRate: Math.round((opened / total) * 100),
      clickRate: Math.round((clicked / total) * 100),
      bounceRate: Math.round((bounced / total) * 100),
      topTemplates,
      recentActivity: recentComms as Array<Record<string, unknown>>,
      failedDeliveries: failedDeliveries as Array<Record<string, unknown>>,
      dailyActivity,
    };
  },

  async listOutbox(limit = 100) {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data } = await db
      .from("communications")
      .select(
        `id, recipient_user_id, template_slug, category, priority, status, rendered_subject, created_at, triggered_by,
         communication_deliveries (id, channel, status, sent_at, error_message)`
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    const rows = (data ?? []) as Array<Record<string, unknown>>;
    if (rows.length === 0) return [];

    const userIds = [...new Set(rows.map((r) => r.recipient_user_id as string))];
    const { data: profiles } = await db.from("profiles").select("id, full_name, email").in("id", userIds);
    const profileMap = new Map(
      ((profiles ?? []) as Array<{ id: string; full_name: string; email: string }>).map((p) => [p.id, p])
    );

    return rows.map((row) => {
      const profile = profileMap.get(row.recipient_user_id as string);
      return {
        ...row,
        recipientName: profile?.full_name ?? "User",
        recipientEmail: profile?.email ?? "",
      };
    });
  },

  async listInbox(filters?: { status?: string; query?: string }) {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    let query = db
      .from("support_tickets")
      .select("id, user_id, subject, status, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(100);

    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    const { data: tickets } = await query;
    const rows = (tickets ?? []) as Array<{
      id: string;
      user_id: string;
      subject: string;
      status: string;
      created_at: string;
      updated_at: string;
    }>;

    if (rows.length === 0) return [];

    const userIds = [...new Set(rows.map((t) => t.user_id))];
    const { data: profiles } = await db.from("profiles").select("id, full_name, email").in("id", userIds);
    const profileMap = new Map(
      ((profiles ?? []) as Array<{ id: string; full_name: string; email: string }>).map((p) => [p.id, p])
    );

    let items = rows.map((t) => {
      const profile = profileMap.get(t.user_id);
      return {
        id: t.id,
        type: "support_ticket" as const,
        sender: profile?.full_name ?? "User",
        senderEmail: profile?.email ?? "",
        subject: t.subject,
        category: "support",
        priority: t.status === "open" ? "high" : "normal",
        status: t.status,
        assignedAdmin: null,
        date: t.updated_at,
        unread: t.status === "open",
      };
    });

    if (filters?.query?.trim()) {
      const q = filters.query.toLowerCase();
      items = items.filter(
        (i) =>
          i.subject.toLowerCase().includes(q) ||
          i.sender.toLowerCase().includes(q) ||
          i.senderEmail.toLowerCase().includes(q)
      );
    }

    return items;
  },

  async globalSearch(query: string) {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const q = query.trim();
    if (!q) return { communications: [], templates: [], tickets: [], broadcasts: [] };

    const [comms, templates, tickets, broadcasts] = await Promise.all([
      db
        .from("communications")
        .select("id, template_slug, rendered_subject, status, created_at")
        .or(`template_slug.ilike.%${q}%,rendered_subject.ilike.%${q}%`)
        .limit(20),
      db
        .from("communication_templates")
        .select("id, slug, name, category")
        .or(`slug.ilike.%${q}%,name.ilike.%${q}%`)
        .limit(20),
      db
        .from("support_tickets")
        .select("id, subject, status, created_at")
        .ilike("subject", `%${q}%`)
        .limit(20),
      db
        .from("broadcast_campaigns")
        .select("id, name, status, created_at")
        .ilike("name", `%${q}%`)
        .limit(20),
    ]);

    return {
      communications: comms.data ?? [],
      templates: templates.data ?? [],
      tickets: tickets.data ?? [],
      broadcasts: broadcasts.data ?? [],
    };
  },

  async getSettings() {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data } = await db.from("communication_settings").select("key, value, updated_at");
    const settings: Record<string, unknown> = {};
    for (const row of (data ?? []) as Array<{ key: string; value: unknown }>) {
      settings[row.key] = row.value;
    }
    return settings;
  },

  async updateSettings(patch: Record<string, unknown>) {
    const admin = await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    for (const [key, value] of Object.entries(patch)) {
      await db
        .from("communication_settings")
        .upsert({ key, value: value as never, updated_by: admin.id, updated_at: new Date().toISOString() } as never);
    }
    await auditService.log({
      actorId: admin.id,
      action: COMMUNICATION_AUDIT_ACTIONS.TEMPLATE_UPDATED,
      entityType: COMMUNICATION_ENTITY_TYPE,
      entityId: admin.id,
      newValues: { settings_keys: Object.keys(patch) },
    });
  },

  async getAnalytics() {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const dashboard = await this.getEnterpriseDashboard();
    const db = createAdminClient();

    const { data: supportTickets } = await db
      .from("support_tickets")
      .select("created_at, updated_at, status")
      .order("created_at", { ascending: false })
      .limit(200);

    const tickets = (supportTickets ?? []) as Array<{ created_at: string; updated_at: string; status: string }>;
    const resolved = tickets.filter((t) => t.status === "closed" || t.status === "replied");
    let avgResolutionHours = 0;
    if (resolved.length > 0) {
      const totalMs = resolved.reduce((sum, t) => {
        return sum + (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime());
      }, 0);
      avgResolutionHours = Math.round(totalMs / resolved.length / 3600000);
    }

    return {
      ...dashboard,
      supportResponseTimeHours: avgResolutionHours,
      totalCommunications: dashboard.recentActivity.length,
      monthlyTrend: dashboard.dailyActivity,
    };
  },
};
