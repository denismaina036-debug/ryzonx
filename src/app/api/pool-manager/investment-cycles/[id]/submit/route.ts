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
    const cycle = await investmentCycleService.submit(id);
    return NextResponse.json({ cycle });
  } catch (error) {
    return errorResponse(error, "Failed to submit investment cycle");
  }
}
