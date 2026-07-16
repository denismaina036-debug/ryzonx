import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { communicationService } from "@/services/communication";

export async function POST(request: Request) {
  try {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const body = (await request.json().catch(() => ({}))) as { limit?: number };
    const result = await communicationService.processEmailQueue(body.limit ?? 25);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Queue processing failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
