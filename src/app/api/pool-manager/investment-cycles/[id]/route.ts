import { NextResponse } from "next/server";
import { investmentCycleService } from "@/services/investment-cycle.service";
import type { UpdateInvestmentCycleInput } from "@/domain/investment/types";

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
    const { id } = await context.params;
    const cycle = await investmentCycleService.getByIdForManager(id);
    return NextResponse.json({ cycle });
  } catch (error) {
    return errorResponse(error, "Failed to load investment cycle");
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as UpdateInvestmentCycleInput;
    const cycle = await investmentCycleService.update(id, body);
    return NextResponse.json({ cycle });
  } catch (error) {
    return errorResponse(error, "Failed to update investment cycle");
  }
}
