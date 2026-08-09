import { NextResponse } from "next/server";
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

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const result = await investmentCycleService.closeCycle(id, "manager");
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "Failed to close investment cycle");
  }
}
