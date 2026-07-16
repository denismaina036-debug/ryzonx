import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { communicationCenterService } from "@/services/communication";

export async function GET() {
  try {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const data = await communicationCenterService.getAnalytics();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load analytics";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
