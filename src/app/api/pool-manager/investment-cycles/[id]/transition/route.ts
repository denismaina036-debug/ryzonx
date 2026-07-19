import { NextResponse } from "next/server";
import type { InvestmentCycleStatus } from "@/constants/investment-cycle";
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
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { status: InvestmentCycleStatus };
    if (!body.status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }
    const cycle = await investmentCycleService.transition(id, body.status, "manager");
    return NextResponse.json({ cycle });
  } catch (error) {
    return errorResponse(error, "Failed to transition investment cycle");
  }
}
