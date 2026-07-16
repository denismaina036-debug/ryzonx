import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { broadcastCenterService } from "@/services/communication";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const { id } = await params;
    const broadcast = await broadcastCenterService.duplicate(id);
    return NextResponse.json({ broadcast });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to duplicate";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
