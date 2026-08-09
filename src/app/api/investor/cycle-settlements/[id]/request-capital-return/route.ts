import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { ROUTES } from "@/constants/routes";
import { cycleInvestorSettlementService } from "@/services/investment-engine/cycle-investor-settlement.service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await cycleInvestorSettlementService.requestCapitalReturn(id);

    revalidatePath(ROUTES.dashboard);
    revalidatePath(ROUTES.investments);
    revalidatePath(ROUTES.portfolio);

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
