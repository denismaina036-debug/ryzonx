import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { investmentCycleService } from "@/services/investment-cycle.service";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient")
    ? 403
    : message.includes("not found")
      ? 404
      : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const { id } = await context.params;
    const cycle = await investmentCycleService.getById(id);
    if (!cycle) {
      return NextResponse.json({ error: "Investment cycle not found." }, { status: 404 });
    }
    return NextResponse.json({ cycle });
  } catch (error) {
    return errorResponse(error, "Failed to load investment cycle");
  }
}
