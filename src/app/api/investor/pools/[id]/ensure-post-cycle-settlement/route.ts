import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { cycleInvestorSettlementService } from "@/services/investment-engine/cycle-investor-settlement.service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: fundId } = await params;
    if (!fundId) {
      return NextResponse.json({ error: "Pool id is required." }, { status: 400 });
    }

    const settlement = await cycleInvestorSettlementService.ensureSettlementForFund(
      user.id,
      fundId
    );

    if (!settlement) {
      return NextResponse.json(
        { error: "No post-cycle capital is available for this pool." },
        { status: 400 }
      );
    }

    return NextResponse.json({ settlement });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not prepare post-cycle choices.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
