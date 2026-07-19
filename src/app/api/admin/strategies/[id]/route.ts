import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { strategyService } from "@/services/strategy.service";

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
    const strategy = await strategyService.getById(id);
    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found." }, { status: 404 });
    }
    return NextResponse.json({ strategy });
  } catch (error) {
    return errorResponse(error, "Failed to load strategy");
  }
}
