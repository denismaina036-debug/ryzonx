import { NextResponse } from "next/server";
import { poolManagerFinancialService } from "@/services/pool-manager-financial.service";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient") ? 403 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const summary = await poolManagerFinancialService.getCycleFinancialSummary(id);
    return NextResponse.json({ summary });
  } catch (error) {
    return errorResponse(error, "Failed to load cycle financial summary");
  }
}
