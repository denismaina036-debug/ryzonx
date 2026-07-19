import { NextResponse } from "next/server";
import { investmentCycleService } from "@/services/investment-cycle.service";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient")
    ? 403
    : 400;
  return NextResponse.json({ error: message }, { status });
}

/** Read-only list of public investment cycles for authenticated investors. */
export async function GET() {
  try {
    const cycles = await investmentCycleService.listPublicForInvestors();
    return NextResponse.json({ cycles });
  } catch (error) {
    return errorResponse(error, "Failed to load investment cycles");
  }
}
