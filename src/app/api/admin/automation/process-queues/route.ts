import { NextResponse } from "next/server";
import { automationService } from "@/services/automation.service";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient") ? 403 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function POST() {
  try {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const result = await automationService.processQueues();
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "Queue processing failed");
  }
}
