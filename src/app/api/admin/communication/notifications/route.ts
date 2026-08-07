import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { communicationCenterService } from "@/services/communication";

export async function GET() {
  try {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const notifications = await communicationCenterService.listNotificationHistory(100);
    return NextResponse.json({ notifications });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load notifications";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
