import { NextResponse } from "next/server";
import { platformInvestmentLevelService } from "@/services/platform-investment-level.service";

/** Public read endpoint for active platform investment levels. */
export async function GET() {
  try {
    const levels = await platformInvestmentLevelService.listActive();
    return NextResponse.json({ levels });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load investment levels";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
