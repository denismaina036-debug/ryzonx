import { NextResponse } from "next/server";
import { supportService } from "@/services/support.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { message: string };
    if (!body.message?.trim()) {
      return NextResponse.json({ error: "Message required." }, { status: 400 });
    }
    await supportService.addInvestorMessage(id, body.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send message.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
