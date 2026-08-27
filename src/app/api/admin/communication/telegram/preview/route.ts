import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { telegramConfigService } from "@/services/communication/telegram/telegram-config.service";
import { formatTelegramAnnouncement, splitTelegramText } from "@/services/communication/telegram/telegram-content";

export async function POST(request: NextRequest) {
  try {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const body = await request.json();
    const config = await telegramConfigService.getAdminConfig();
    const content = formatTelegramAnnouncement({
      heading: String(body.heading ?? "").slice(0, 300),
      html: String(body.content ?? ""),
      appendWebsiteLink: config.appendWebsiteLink,
      websiteUrl: (process.env.NEXT_PUBLIC_APP_URL ?? "https://ryvonx.com").replace(/\/$/, ""),
    });
    return NextResponse.json({ preview: { text: content.plainText, parts: splitTelegramText(content.plainText), imageUrl: content.imageUrl, destination: config.chatId || "Not configured" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Preview failed" }, { status: 400 });
  }
}
