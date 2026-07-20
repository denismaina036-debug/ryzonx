import { NextResponse } from "next/server";
import { poolManagerApplicationService } from "@/services/pool-manager-application.service";

export async function GET() {
  try {
    const payment = await poolManagerApplicationService.getAdmissionPaymentState();
    return NextResponse.json({ payment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load payment state";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
