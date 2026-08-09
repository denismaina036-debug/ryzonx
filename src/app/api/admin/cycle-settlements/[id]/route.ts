import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { cycleInvestorSettlementService } from "@/services/investment-engine/cycle-investor-settlement.service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      action: "approve" | "reject";
      adminNotes?: string;
    };

    if (body.action === "approve") {
      await cycleInvestorSettlementService.approveCapitalReturn(id);
    } else if (body.action === "reject") {
      await cycleInvestorSettlementService.rejectCapitalReturn(id, body.adminNotes);
    } else {
      return NextResponse.json({ error: "Action required." }, { status: 400 });
    }

    revalidatePath("/admin/finance/cycle-settlements");
    revalidatePath("/admin/finance/withdrawals/pending");

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Action failed.";
    const status = message.includes("permissions") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
