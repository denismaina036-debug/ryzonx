import { NextResponse } from "next/server";
import type { CycleProfitSplit } from "@/domain/investment/profit-split";
import { investmentCycleService } from "@/services/investment-cycle.service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { profitSplits?: CycleProfitSplit[] };
    if (!Array.isArray(body.profitSplits)) {
      return NextResponse.json({ error: "Profit splits are required." }, { status: 400 });
    }
    const cycle = await investmentCycleService.updateProfitSplits(id, body.profitSplits);
    return NextResponse.json({ cycle });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update profit splits.";
    const status = message.includes("permissions") ? 403 : message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
