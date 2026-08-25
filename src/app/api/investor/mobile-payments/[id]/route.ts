import { NextResponse } from "next/server";
import { mobilePaymentService } from "@/services/mobile-payment.service";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const refresh = new URL(request.url).searchParams.get("refresh") === "true";
    const result = await mobilePaymentService.getForUser(id, refresh);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load payment.";
    const status = message.includes("Authentication") ? 401 : message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

