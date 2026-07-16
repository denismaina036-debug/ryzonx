import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { communicationService } from "@/services/communication";

export async function GET(request: Request) {
  try {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "50");
    const history = await communicationService.listHistory(limit);
    return NextResponse.json({ history });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load history";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
