import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { cycleInvestorSettlementService } from "@/services/investment-engine/cycle-investor-settlement.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: fundId } = await params;
    if (!fundId) {
      return NextResponse.json({ error: "Pool id is required." }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      purpose?: "capital" | "profit";
    };
    const settlement =
      body.purpose === "profit"
        ? await cycleInvestorSettlementService.ensureProfitSettlementForFund(user.id, fundId)
        : await cycleInvestorSettlementService.ensureSettlementForFund(user.id, fundId);

    if (!settlement) {
      return NextResponse.json(
        {
          error:
            body.purpose === "profit"
              ? "No pool profit is available to reinvest."
              : "No post-cycle capital is available for this pool.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ settlement });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not prepare post-cycle choices.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
