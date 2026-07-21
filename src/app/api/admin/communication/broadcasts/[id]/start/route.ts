import { NextResponse } from "next/server";
import { broadcastCenterService } from "@/services/communication";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const result = await broadcastCenterService.start(id);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not start broadcast";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
