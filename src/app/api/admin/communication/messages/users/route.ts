import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { communicationCenterService } from "@/services/communication";

export async function GET(request: NextRequest) {
  try {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const { searchParams } = new URL(request.url);
    const listAll = searchParams.get("all") === "1";

    if (listAll) {
      const users = await communicationCenterService.listMessageRecipients();
      return NextResponse.json({ users });
    }

    const q = searchParams.get("q") ?? "";
    const users = await communicationCenterService.searchUsers(q, 20);
    return NextResponse.json({ users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to search users";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
