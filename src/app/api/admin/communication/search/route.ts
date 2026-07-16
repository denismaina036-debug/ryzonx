import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { communicationCenterService } from "@/services/communication";

export async function GET(request: NextRequest) {
  try {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const q = request.nextUrl.searchParams.get("q") ?? "";
    const results = await communicationCenterService.globalSearch(q);
    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
