import { NextResponse } from "next/server";
import { initiateMobilePaymentSchema } from "@/lib/mobile-payments/mpesa";
import { mobilePaymentService } from "@/services/mobile-payment.service";

export async function POST(request: Request) {
  try {
    const parsed = initiateMobilePaymentSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Check the amount and M-Pesa phone number.", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const result = await mobilePaymentService.initiate({ amountUsd: parsed.data.amountUsd, phone: parsed.data.phone });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start M-Pesa payment.";
    const status = message.includes("Authentication") ? 401 : message.includes("Too many") ? 429 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

