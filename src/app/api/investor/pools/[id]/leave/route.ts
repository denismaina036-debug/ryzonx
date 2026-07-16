import { NextResponse } from "next/server";
import { poolParticipationService } from "@/services/pool-participation.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fundId } = await params;
    const body = (await request.json().catch(() => ({}))) as { fundId?: string };
    const targetId = fundId || body.fundId;
    if (!targetId) {
      return NextResponse.json({ error: "Pool id is required." }, { status: 400 });
    }
    await poolParticipationService.leavePool(targetId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Opt-out failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
