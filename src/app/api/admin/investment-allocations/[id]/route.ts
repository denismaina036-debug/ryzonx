import { NextResponse } from "next/server";
import { investmentAllocationService } from "@/services/investment-allocation.service";
import type { InvestmentAllocationStatus } from "@/constants/investment-allocation";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient")
    ? 403
    : message.includes("not found")
      ? 404
      : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { status: InvestmentAllocationStatus };
    if (!body.status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }
    const allocation = await investmentAllocationService.updateStatus(id, body.status);
    return NextResponse.json({ allocation });
  } catch (error) {
    return errorResponse(error, "Failed to update allocation");
  }
}
