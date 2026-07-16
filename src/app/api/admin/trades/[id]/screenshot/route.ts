import { NextResponse } from "next/server";
import { tradeAdminService } from "@/services/trade-admin.service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { screenshotUrl?: string };
    await tradeAdminService.updateTradeScreenshot(id, body.screenshotUrl ?? "");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
