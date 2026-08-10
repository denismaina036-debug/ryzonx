import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { ROUTES } from "@/constants/routes";
import { transactionService } from "@/services/transaction.service";

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

    if (!body.action) {
      return NextResponse.json({ error: "Action required." }, { status: 400 });
    }

    if (body.action === "approve") {
      await transactionService.approveWithdrawal(id);
    } else {
      await transactionService.rejectWithdrawal(id, body.adminNotes);
    }

    revalidatePath(ROUTES.dashboard);
    revalidatePath(ROUTES.investments);
    revalidatePath(ROUTES.transactions);
    revalidatePath(ROUTES.withdrawals);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Action failed.";
    const status = message.includes("permissions") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
