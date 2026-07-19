import { NextResponse } from "next/server";
import { ledgerValidationService } from "@/services/ledger-validation.service";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient") ? 403 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const integrity = await ledgerValidationService.verifyIntegrity();
    return NextResponse.json({ integrity });
  } catch (error) {
    return errorResponse(error, "Failed to verify ledger integrity");
  }
}
