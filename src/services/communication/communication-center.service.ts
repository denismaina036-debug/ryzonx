import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { COMMUNICATION_AUDIT_ACTIONS, COMMUNICATION_ENTITY_TYPE } from "@/constants/communication";
import { ADMIN_ANNOUNCEMENT_TEMPLATE_SLUG } from "@/constants/communication-center";
import { auditService } from "@/services/audit.service";
import { communicationRepository } from "@/services/communication/communication-repository";
import { communicationService } from "@/services/communication/communication.service";
import { emailQueueService } from "@/services/communication/email/email-queue.service";
import { emailTemplateService } from "@/services/communication/email-template.service";
import { buildUserCommunicationVariables } from "@/services/communication/user-variables";
import {
  isAdminMessageHtmlEmpty,
  prepareAdminMessageContent,
} from "@/services/communication/email/admin-message-html";
import type { CommunicationChannel } from "@/domain/communication/types";

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

export interface OperationalDashboardStats {
  messagesSent: number;
  campaignsPendingReview: number;
  notificationsSent: number;
  failedNotifications: number;
  recentActivity: Array<{
    id: string;
    templateSlug: string | null;
    subject: string | null;
    status: string;
    createdAt: string;
  }>;
}

export interface AdminMessageSendResult {
  sent: number;
  failed: number;
  recipientCount: number;
  status: "sent" | "partial" | "failed";
}

export interface NotificationHistoryRow {
  id: string;
  recipientName: string;
  recipientEmail: string;
  notification: string;
  type: string;
  channel: string;
  status: string;
  date: string;
}

export interface AdminUserSearchResult {
  id: string;
  fullName: string;
  email: string;
  role: string;
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

  async getOperationalDashboard(): Promise<OperationalDashboardStats> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const [messagesSentRes, campaignsPendingRes, notificationsSentRes, failedRes, recentComms] =
      await Promise.all([
        db
          .from("communications")
          .select("id", { count: "exact", head: true })
          .not("triggered_by", "is", null)
          .gte("created_at", todayIso),
        db
          .from("pool_manager_content")
          .select("id", { count: "exact", head: true })
          .eq("status", "submitted"),
        db
          .from("communication_deliveries")
          .select("id", { count: "exact", head: true })
          .in("status", ["sent", "delivered"])
          .gte("created_at", todayIso),
        db
          .from("communication_deliveries")
          .select("id", { count: "exact", head: true })
          .eq("status", "failed"),
        communicationRepository.listRecentHistory(8),
      ]);

    return {
      messagesSent: messagesSentRes.count ?? 0,
      campaignsPendingReview: campaignsPendingRes.count ?? 0,
      notificationsSent: notificationsSentRes.count ?? 0,
      failedNotifications: failedRes.count ?? 0,
      recentActivity: (recentComms as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id),
        templateSlug: (row.template_slug as string | null) ?? null,
        subject: (row.rendered_subject as string | null) ?? null,
        status: String(row.status ?? "unknown"),
        createdAt: String(row.created_at),
      })),
    };
  },

  async searchUsers(query: string, limit = 20): Promise<AdminUserSearchResult[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const q = query.trim();
    if (!q) return [];

    const { data } = await db
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("is_active", true)
      .not("email", "is", null)
      .neq("email", "")
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
      .order("full_name")
      .limit(limit);

    return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: row.id as string,
      fullName: (row.full_name as string) ?? "User",
      email: (row.email as string) ?? "",
      role: (row.role as string) ?? "investor",
    }));
  },

  async listMessageRecipients(): Promise<AdminUserSearchResult[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data } = await db
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("is_active", true)
      .not("email", "is", null)
      .neq("email", "")
      .order("email");

    return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: row.id as string,
      fullName: (row.full_name as string) ?? "User",
      email: (row.email as string) ?? "",
      role: (row.role as string) ?? "investor",
    }));
  },

  async listAdminMessages(limit = 50) {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data } = await db
      .from("communications")
      .select(
        `id, recipient_user_id, template_slug, category, priority, status, rendered_subject, created_at, triggered_by,
         communication_deliveries (id, channel, status, sent_at, error_message)`
      )
      .eq("template_slug", ADMIN_ANNOUNCEMENT_TEMPLATE_SLUG)
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

  async sendAdminMessage(input: {
    audience: "all" | "individual";
    recipientUserId?: string;
    channels: CommunicationChannel[];
    heading: string;
    content: string;
  }): Promise<AdminMessageSendResult> {
    const admin = await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const heading = input.heading.trim();
    const content = input.content.trim();
    if (!heading) throw new Error("Heading is required.");
    if (!content || isAdminMessageHtmlEmpty(content)) {
      throw new Error("Message content is required.");
    }

    const preparedContent = prepareAdminMessageContent(content);

    if (input.channels.length === 0) {
      throw new Error("Select at least one channel.");
    }

    await emailTemplateService.ensureCatalogTemplate(ADMIN_ANNOUNCEMENT_TEMPLATE_SLUG);

    let recipientIds: string[] = [];
    if (input.audience === "individual") {
      if (!input.recipientUserId) throw new Error("Select a user to message.");
      recipientIds = [input.recipientUserId];
    } else {
      const { data } = await db
        .from("profiles")
        .select("id")
        .eq("is_active", true)
        .not("email", "is", null)
        .neq("email", "");
      recipientIds = ((data ?? []) as Array<{ id: string }>).map((row) => row.id);
    }

    if (recipientIds.length === 0) {
      return { sent: 0, failed: 0, recipientCount: 0, status: "failed" };
    }

    let sent = 0;
    let failed = 0;
    const batchSize = 10;
    const announcementVariables = {
      announcement_title: heading,
      announcement_body: preparedContent.html,
      announcement_body_plain: preparedContent.plainText,
    };

    for (let index = 0; index < recipientIds.length; index += batchSize) {
      const batch = recipientIds.slice(index, index + batchSize);
      await Promise.all(
        batch.map(async (recipientUserId) => {
          try {
            const variables = await buildUserCommunicationVariables(
              recipientUserId,
              announcementVariables
            );
            const result = await communicationService.send({
              templateSlug: ADMIN_ANNOUNCEMENT_TEMPLATE_SLUG,
              recipientUserId,
              variables,
              channels: input.channels,
              category: "announcements",
              priority: "normal",
              triggeredBy: admin.id,
              metadata: { admin_message: true, audience: input.audience },
            });
            if (result.status === "failed") failed += 1;
            else sent += 1;
          } catch {
            failed += 1;
          }
        })
      );
    }

    for (let pass = 0; pass < 20; pass += 1) {
      const queueResult = await emailQueueService.processPending(50);
      if (queueResult.processed === 0) break;
    }

    await auditService.log({
      actorId: admin.id,
      action: COMMUNICATION_AUDIT_ACTIONS.SEND,
      entityType: COMMUNICATION_ENTITY_TYPE,
      entityId: admin.id,
      newValues: {
        template_slug: ADMIN_ANNOUNCEMENT_TEMPLATE_SLUG,
        audience: input.audience,
        recipient_count: recipientIds.length,
        sent,
        failed,
      },
    });

    const status: AdminMessageSendResult["status"] =
      failed === 0 ? "sent" : sent === 0 ? "failed" : "partial";

    return {
      sent,
      failed,
      recipientCount: recipientIds.length,
      status,
    };
  },

  async listNotificationHistory(limit = 100): Promise<NotificationHistoryRow[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const { data } = await db
      .from("communication_deliveries")
      .select(
        `id, channel, status, sent_at, delivered_at, created_at,
         communications (
           template_slug, category, rendered_subject, rendered_in_app_title, recipient_user_id
         )`
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    const rows = (data ?? []) as Array<Record<string, unknown>>;
    if (rows.length === 0) return [];

    const userIds = [
      ...new Set(
        rows
          .map((row) => {
            const comm = row.communications as Record<string, unknown> | null;
            return comm?.recipient_user_id as string | undefined;
          })
          .filter(Boolean)
      ),
    ] as string[];

    const { data: profiles } = await db
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);
    const profileMap = new Map(
      ((profiles ?? []) as Array<{ id: string; full_name: string; email: string }>).map((p) => [
        p.id,
        p,
      ])
    );

    return rows.map((row) => {
      const comm = row.communications as Record<string, unknown> | null;
      const userId = comm?.recipient_user_id as string | undefined;
      const profile = userId ? profileMap.get(userId) : undefined;
      const date =
        (row.delivered_at as string | null) ??
        (row.sent_at as string | null) ??
        (row.created_at as string);

      return {
        id: row.id as string,
        recipientName: profile?.full_name ?? "User",
        recipientEmail: profile?.email ?? "",
        notification:
          (comm?.rendered_in_app_title as string | null) ??
          (comm?.rendered_subject as string | null) ??
          (comm?.template_slug as string | null) ??
          "Notification",
        type: String(comm?.category ?? comm?.template_slug ?? "communication"),
        channel: String(row.channel),
        status: String(row.status),
        date,
      };
    });
  },
};
