import { NextResponse } from "next/server";
import { investmentAllocationService } from "@/services/investment-allocation.service";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient")
    ? 403
    : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const allocations = await investmentAllocationService.listByCycle(id);
    return NextResponse.json({ allocations });
  } catch (error) {
    return errorResponse(error, "Failed to load cycle allocations");
  }
}
