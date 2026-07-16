import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { broadcastCenterService } from "@/services/communication";

export async function GET() {
  try {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const broadcasts = await broadcastCenterService.list();
    return NextResponse.json({ broadcasts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load broadcasts";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const body = await request.json();
    const broadcast = await broadcastCenterService.create(body);
    return NextResponse.json({ broadcast });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create broadcast";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
