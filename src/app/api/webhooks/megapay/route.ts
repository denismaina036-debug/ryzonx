import { NextResponse } from "next/server";
import { megaPayWebhookSchema } from "@/lib/mobile-payments/mpesa";
import { mobilePaymentService } from "@/services/mobile-payment.service";

export async function POST(request: Request) {
  const parsed = megaPayWebhookSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid MegaPay webhook payload." }, { status: 400 });
  }
  try {
    const result = await mobilePaymentService.processMegaPayWebhook(parsed.data);
    return NextResponse.json({ status: "success", ...result });
  } catch (error) {
    console.error("[megapay-webhook] processing failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}

