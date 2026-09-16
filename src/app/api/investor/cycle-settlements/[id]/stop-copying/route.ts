import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ROUTES } from "@/constants/routes";
import { cycleInvestorSettlementService } from "@/services/investment-engine/cycle-investor-settlement.service";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const result = await cycleInvestorSettlementService.stopCopying(id);
    revalidatePath(ROUTES.dashboard);
    revalidatePath(ROUTES.investments);
    revalidatePath(ROUTES.portfolio);
    revalidatePath(ROUTES.transactions);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not stop copying.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
