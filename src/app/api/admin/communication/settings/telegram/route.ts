import { NextRequest, NextResponse } from "next/server";
import { telegramConfigService } from "@/services/communication/telegram/telegram-config.service";

export async function GET() {
  try {
    return NextResponse.json({ telegram: await telegramConfigService.getAdminConfig() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Access denied" }, { status: 403 });
  }
}
export async function PUT(request: NextRequest) {
  try {
    const telegram = await telegramConfigService.update(await request.json());
    return NextResponse.json({ telegram });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save Telegram settings" }, { status: 400 });
  }
}
