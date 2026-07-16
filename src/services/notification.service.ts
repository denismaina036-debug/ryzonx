import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";
import type { InvestorNotification } from "@/features/investor/types/account";
import { communicationTriggers } from "@/services/communication/communication-triggers.service";
import { legacyTypeToTemplateSlug } from "@/services/communication/legacy-type-map";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function mapNotification(row: NotificationRow): InvestorNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    isRead: row.is_read,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

/**
 * In-app notification read/mark API.
 * Sending is delegated to the Communication Engine.
 */
export const notificationService = {
  async getInvestorNotifications(): Promise<InvestorNotification[]> {
    const user = await requireAuth();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, title, message, is_read, metadata, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return (data as NotificationRow[]).map(mapNotification);
  },

  async getUnreadCount(): Promise<number> {
    const user = await requireAuth();
    const supabase = await createClient();

    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    return count ?? 0;
  },

  async markAsRead(notificationId: string): Promise<void> {
    const user = await requireAuth();
    const supabase = await createClient();

    await supabase
      .from("notifications")
      .update({ is_read: true } as never)
      .eq("id", notificationId)
      .eq("user_id", user.id);
  },

  async markAllAsRead(): Promise<void> {
    const user = await requireAuth();
    const supabase = await createClient();

    await supabase
      .from("notifications")
      .update({ is_read: true } as never)
      .eq("user_id", user.id)
      .eq("is_read", false);
  },

  /** Routes legacy callers through communicationTriggers. */
  async sendToUser(input: {
    userId: string;
    type: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await communicationTriggers.legacyInApp({
      userId: input.userId,
      templateSlug: legacyTypeToTemplateSlug(input.type),
      notificationType: input.type,
      title: input.title,
      message: input.message,
      metadata: input.metadata,
    });
  },
};
