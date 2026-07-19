import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { profitDistributionService } from "@/services/profit-distribution.service";

export async function POST(request: Request) {
  try {
    const user = await requireRole(USER_ROLES.ADMINISTRATOR);
    const body = (await request.json()) as {
      cycleId: string;
      grossTradingProfitOverride?: number;
    };
    if (!body.cycleId) {
      return NextResponse.json({ error: "cycleId is required." }, { status: 400 });
    }
    const settlement = await profitDistributionService.calculateSettlementForCycle(
      body.cycleId,
      user.id,
      { grossTradingProfitOverride: body.grossTradingProfitOverride }
    );
    return NextResponse.json({ settlement });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Calculation failed." },
      { status: 400 }
    );
  }
}
