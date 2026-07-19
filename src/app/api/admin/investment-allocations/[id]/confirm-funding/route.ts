import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { settlementService } from "@/services/settlement.service";

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
    await settlementService.confirmFunding(id, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Failed to confirm funding");
  }
}
