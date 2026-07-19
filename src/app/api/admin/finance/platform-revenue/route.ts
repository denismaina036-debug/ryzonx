import { NextResponse } from "next/server";
import { profitDistributionService } from "@/services/profit-distribution.service";

export async function GET() {
  try {
    const summary = await profitDistributionService.getPlatformRevenueSummary();
    return NextResponse.json({ summary });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load revenue." },
      { status: 400 }
    );
  }
}
