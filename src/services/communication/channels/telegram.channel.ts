import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { telegramConfigService } from "@/services/communication/telegram/telegram-config.service";
import { sendTelegramAnnouncement, TelegramDeliveryError } from "@/services/communication/telegram/telegram-api";
import type { ChannelDispatchResult, CommunicationChannelAdapter } from "./types";

type PublicationRow = {
  id: string;
  status: string;
  external_ids: unknown;
  attempt_count: number;
};

function websiteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://ryvonx.com").replace(/\/$/, "");
}

export const telegramChannel: CommunicationChannelAdapter = {
  channel: "telegram",

  async dispatch(ctx): Promise<ChannelDispatchResult> {
    const config = await telegramConfigService.getRuntimeConfig();
    if (!config.enabled) return { status: "failed", error: "Telegram publishing is disabled." };
    if (!config.token || !config.chatId) return { status: "failed", error: "Telegram integration is not fully configured." };
    if (ctx.metadata?.telegram_broadcast !== true || ctx.metadata?.audience === "individual" || ctx.category === "support") {
      return { status: "failed", error: "Telegram is only available for general announcements." };
    }

    const heading = String(ctx.metadata?.telegram_heading ?? ctx.rendered.subject ?? "RyvonX announcement");
    const html = String(ctx.metadata?.telegram_html ?? ctx.rendered.html ?? ctx.rendered.body);
    const db = createAdminClient() as unknown as SupabaseClient;
    const claim = {
      communication_id: ctx.communicationId,
      delivery_id: ctx.deliveryId,
      provider: "telegram",
      destination_id: config.chatId,
      status: "sending",
    };
    const { data: inserted, error: insertError } = await db
      .from("communication_provider_publications")
      .insert(claim as never)
      .select("id, status, external_ids, attempt_count")
      .maybeSingle();

    let publication = inserted as PublicationRow | null;
    if (insertError) {
      const { data: existing } = await db
        .from("communication_provider_publications")
        .select("id, status, external_ids, attempt_count")
        .eq("communication_id", ctx.communicationId)
        .eq("provider", "telegram")
        .eq("destination_id", config.chatId)
        .maybeSingle();
      publication = existing as PublicationRow | null;
      if (!publication) return { status: "failed", error: "Could not reserve Telegram delivery." };
      if (publication.status === "sent" || publication.status === "delivered") {
        const ids = Array.isArray(publication.external_ids) ? publication.external_ids.map(String) : [];
        return { status: "sent", externalId: ids.join(",") };
      }
      if (publication.status === "sending") {
        return { status: "failed", error: "Telegram delivery is already in progress." };
      }
      await db
        .from("communication_provider_publications")
        .update({ status: "sending", failure_category: null, attempt_count: publication.attempt_count + 1 } as never)
        .eq("id", publication.id);
    }

    try {
      const result = await sendTelegramAnnouncement({
        token: config.token,
        chatId: config.chatId,
        heading,
        html,
        appendWebsiteLink: config.appendWebsiteLink,
        websiteUrl: websiteUrl(),
      });
      await db
        .from("communication_provider_publications")
        .update({ status: "sent", external_ids: result.messageIds, failure_category: null } as never)
        .eq("id", publication!.id);
      return { status: "sent", externalId: result.messageIds.join(",") };
    } catch (error) {
      const telegramError = error instanceof TelegramDeliveryError ? error : null;
      await db
        .from("communication_provider_publications")
        .update({ status: "failed", failure_category: telegramError?.category ?? "unknown" } as never)
        .eq("id", publication!.id);
      return { status: "failed", error: telegramError?.message ?? "Telegram delivery failed." };
    }
  },
};
