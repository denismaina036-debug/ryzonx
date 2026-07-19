import { NextResponse } from "next/server";
import { financialHealthService } from "@/services/financial-health.service";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient") ? 403 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const operations = await financialHealthService.getAdminOperationsView();
    return NextResponse.json({ operations });
  } catch (error) {
    return errorResponse(error, "Failed to load financial operations");
  }
}
