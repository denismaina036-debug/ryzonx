import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { distributionService } from "@/services/distribution.service";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient") ? 403 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(USER_ROLES.ADMINISTRATOR);
    const { id } = await context.params;
    const record = await distributionService.completeRecord(id, user.id);
    return NextResponse.json({ record });
  } catch (error) {
    return errorResponse(error, "Failed to complete distribution");
  }
}
