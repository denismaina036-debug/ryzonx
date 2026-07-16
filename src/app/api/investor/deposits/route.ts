import { NextResponse } from "next/server";
import { depositService } from "@/services/deposit.service";
import type { SubmitCryptoDepositInput } from "@/features/investor/types/deposit";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SubmitCryptoDepositInput;

    if (!body.walletId || !body.symbol || !body.networkCode || !body.amount) {
      return NextResponse.json(
        { error: "Missing required deposit fields." },
        { status: 400 }
      );
    }

    const result = await depositService.submitCryptoDeposit(body);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Deposit submission failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
