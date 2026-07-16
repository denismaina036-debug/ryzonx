import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { announcementCenterService } from "@/services/communication";

export async function GET() {
  try {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const announcements = await announcementCenterService.list();
    return NextResponse.json({ announcements });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load announcements";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const body = await request.json();
    const announcement = await announcementCenterService.create(body);
    return NextResponse.json({ announcement });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create announcement";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
