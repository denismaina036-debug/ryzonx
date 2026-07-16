import { createAdminClient } from "@/lib/supabase/admin";
import type { CommunicationChannelAdapter, ChannelDispatchResult } from "./types";

/**
 * In-app channel — writes to existing notifications table.
 * All in-app comms flow through the communication engine.
 */
export const inAppChannel: CommunicationChannelAdapter = {
  channel: "in_app",

  async dispatch(ctx): Promise<ChannelDispatchResult> {
    const title = ctx.rendered.inAppTitle ?? ctx.rendered.subject ?? "RyvonX";
    const message = ctx.rendered.inAppBody ?? ctx.rendered.body;

    if (!message.trim()) {
      return { status: "failed", error: "No in-app message content to deliver." };
    }

    try {
      const db = createAdminClient();
      const { data, error } = await db
        .from("notifications")
        .insert({
          user_id: ctx.recipientUserId,
          type: ctx.notificationType,
          title,
          message,
          metadata: {
            ...(ctx.metadata ?? {}),
            communication_id: ctx.communicationId,
            delivery_id: ctx.deliveryId,
            category: ctx.category ?? ctx.metadata?.template_category,
            priority: ctx.priority ?? ctx.metadata?.template_priority ?? "normal",
            action_url: ctx.metadata?.action_url,
            action_label: ctx.metadata?.action_label ?? "View",
          },
        } as never)
        .select("id")
        .single();

      if (error || !data) {
        return { status: "failed", error: error?.message ?? "In-app insert failed." };
      }

      return {
        status: "delivered",
        notificationId: (data as { id: string }).id,
      };
    } catch (err) {
      return {
        status: "failed",
        error: err instanceof Error ? err.message : "In-app delivery failed.",
      };
    }
  },
};
