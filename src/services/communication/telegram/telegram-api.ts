import {
  TELEGRAM_CAPTION_LIMIT,
  formatTelegramAnnouncement,
  splitTelegramText,
} from "./telegram-content";

type TelegramApiResponse<T> = { ok: boolean; result?: T; description?: string; error_code?: number };

export class TelegramDeliveryError extends Error {
  constructor(message: string, readonly category: string, readonly retryable = false) {
    super(message);
    this.name = "TelegramDeliveryError";
  }
}

function sanitizedTelegramError(status: number, description?: string): TelegramDeliveryError {
  const normalized = (description ?? "").toLowerCase();
  if (status === 401 || normalized.includes("unauthorized")) return new TelegramDeliveryError("Invalid bot token.", "invalid_token");
  if (normalized.includes("chat not found")) return new TelegramDeliveryError("Telegram channel was not found. Check the Chat ID.", "chat_not_found");
  if (normalized.includes("not enough rights") || normalized.includes("forbidden") || normalized.includes("administrator")) {
    return new TelegramDeliveryError("The bot does not have permission to post in this channel.", "permission_denied");
  }
  if (status === 429) return new TelegramDeliveryError("Telegram rate limit reached. Try again shortly.", "rate_limited", true);
  if (status >= 500) return new TelegramDeliveryError("Telegram is temporarily unavailable.", "provider_unavailable", true);
  return new TelegramDeliveryError("Telegram request failed.", "provider_rejected");
}

async function telegramRequest<T>(token: string, method: string, payload: Record<string, unknown>): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => ({}))) as TelegramApiResponse<T>;
    if (!response.ok || !data.ok || data.result == null) {
      throw sanitizedTelegramError(response.status, data.description);
    }
    return data.result;
  } catch (error) {
    if (error instanceof TelegramDeliveryError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new TelegramDeliveryError(
        "Telegram did not confirm delivery before the request timed out.",
        "delivery_unknown",
        false
      );
    }
    throw new TelegramDeliveryError("Could not reach Telegram.", "network_error", true);
  } finally {
    clearTimeout(timeout);
  }
}

type TelegramMessage = { message_id: number; chat?: { title?: string; username?: string } };

export async function inspectTelegramConnection(token: string, chatId: string) {
  const bot = await telegramRequest<{ username?: string }>(token, "getMe", {});
  const chat = await telegramRequest<{ title?: string; username?: string }>(token, "getChat", { chat_id: chatId });
  return { botUsername: bot.username ?? null, destinationTitle: chat.title ?? chat.username ?? null };
}

export async function sendTelegramTestMessage(token: string, chatId: string): Promise<number> {
  const message = await telegramRequest<TelegramMessage>(token, "sendMessage", {
    chat_id: chatId,
    text: "RyvonX Telegram integration connected successfully.",
  });
  return message.message_id;
}

export async function sendTelegramAnnouncement(input: {
  token: string;
  chatId: string;
  heading: string;
  html: string;
  appendWebsiteLink: boolean;
  websiteUrl: string;
}): Promise<{ messageIds: string[] }> {
  const content = formatTelegramAnnouncement(input);
  const messageIds: string[] = [];

  if (content.imageUrl) {
    if (content.formattedText.length <= TELEGRAM_CAPTION_LIMIT) {
      try {
        const photo = await telegramRequest<TelegramMessage>(input.token, "sendPhoto", {
          chat_id: input.chatId,
          photo: content.imageUrl,
          caption: content.formattedText,
          parse_mode: "HTML",
        });
        return { messageIds: [String(photo.message_id)] };
      } catch (error) {
        if (!(error instanceof TelegramDeliveryError) || error.category !== "provider_rejected") throw error;
      }
    }
    try {
      const photo = await telegramRequest<TelegramMessage>(input.token, "sendPhoto", {
        chat_id: input.chatId,
        photo: content.imageUrl,
      });
      messageIds.push(String(photo.message_id));
    } catch (error) {
      if (!(error instanceof TelegramDeliveryError) || !["provider_rejected", "network_error"].includes(error.category)) throw error;
      // An inaccessible editor image must not discard the announcement text.
    }
  }

  const chunks = splitTelegramText(content.formattedText);
  for (const chunk of chunks) {
    try {
      const message = await telegramRequest<TelegramMessage>(input.token, "sendMessage", {
        chat_id: input.chatId,
        text: chunk,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      });
      messageIds.push(String(message.message_id));
    } catch (error) {
      if (!(error instanceof TelegramDeliveryError) || error.category !== "provider_rejected") throw error;
      const fallback = await telegramRequest<TelegramMessage>(input.token, "sendMessage", {
        chat_id: input.chatId,
        text: chunk.replace(/<\/?b>/g, ""),
        disable_web_page_preview: false,
      });
      messageIds.push(String(fallback.message_id));
    }
  }
  return { messageIds };
}
