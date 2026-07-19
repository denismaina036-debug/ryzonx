import { NextResponse } from "next/server";
import { investorFinancialService } from "@/services/investor-financial.service";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient") ? 403 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const financial = await investorFinancialService.getFinancialView();
    return NextResponse.json({ financial });
  } catch (error) {
    return errorResponse(error, "Failed to load financial view");
  }
}
