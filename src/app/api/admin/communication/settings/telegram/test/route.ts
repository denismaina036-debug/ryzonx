import { NextResponse } from "next/server";
import { telegramConfigService } from "@/services/communication/telegram/telegram-config.service";

export async function POST() {
  try {
    return NextResponse.json(await telegramConfigService.testConnection());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Telegram request failed." }, { status: 400 });
  }
}
