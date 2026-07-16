import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { communicationCenterService } from "@/services/communication";

export async function GET(request: NextRequest) {
  try {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const status = request.nextUrl.searchParams.get("status") ?? "all";
    const query = request.nextUrl.searchParams.get("query") ?? "";
    const items = await communicationCenterService.listInbox({ status, query });
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load inbox";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
