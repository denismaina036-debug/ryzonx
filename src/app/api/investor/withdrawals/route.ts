import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { ROUTES } from "@/constants/routes";
import { transactionService } from "@/services/transaction.service";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      amount: number;
      destination: string;
      fundId?: string;
      cryptoSymbol?: string; cryptoNetwork?: string;
    };

    if (!body.amount || !body.destination) {
      return NextResponse.json(
        { error: "Amount and destination are required." },
        { status: 400 }
      );
    }

    const result = await transactionService.submitWithdrawal(body);
    revalidatePath(ROUTES.dashboard);
    revalidatePath(ROUTES.investments);
    revalidatePath(ROUTES.transactions);
    revalidatePath(ROUTES.withdrawals);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Withdrawal submission failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
