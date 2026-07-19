import { NextResponse } from "next/server";
import { investmentAllocationService } from "@/services/investment-allocation.service";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient")
    ? 403
    : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cycleId = searchParams.get("cycleId") ?? undefined;
    const investorId = searchParams.get("investorId") ?? undefined;
    const allocations = await investmentAllocationService.listAll({ cycleId, investorId });
    return NextResponse.json({ allocations });
  } catch (error) {
    return errorResponse(error, "Failed to load allocations");
  }
}
