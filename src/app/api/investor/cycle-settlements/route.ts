import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { cycleInvestorSettlementService } from "@/services/investment-engine/cycle-investor-settlement.service";

export async function GET() {
  try {
    const user = await requireAuth();
    const settlements = await cycleInvestorSettlementService.listPendingForInvestor(user.id);
    return NextResponse.json({ settlements });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load settlements.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
