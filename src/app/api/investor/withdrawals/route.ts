import { NextResponse } from "next/server";
import { transactionService } from "@/services/transaction.service";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      amount: number;
      destination: string;
      fundId?: string;
    };

    if (!body.amount || !body.destination) {
      return NextResponse.json(
        { error: "Amount and destination are required." },
        { status: 400 }
      );
    }

    const result = await transactionService.submitWithdrawal(body);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Withdrawal submission failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
