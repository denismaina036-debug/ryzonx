import { NextResponse } from "next/server";
import { investmentCycleService } from "@/services/investment-cycle.service";
import type { InvestmentCycleStatus } from "@/constants/investment-cycle";

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
    const status = searchParams.get("status") as InvestmentCycleStatus | null;
    const cycles = await investmentCycleService.listAll(
      status ? { status } : undefined
    );
    return NextResponse.json({ cycles });
  } catch (error) {
    return errorResponse(error, "Failed to load investment cycles");
  }
}
