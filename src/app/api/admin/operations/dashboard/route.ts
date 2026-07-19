import { NextResponse } from "next/server";
import { adminOperationsService } from "@/services/admin-operations.service";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient") ? 403 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const dashboard = await adminOperationsService.getExecutiveDashboard();
    return NextResponse.json({ dashboard });
  } catch (error) {
    return errorResponse(error, "Failed to load operations dashboard");
  }
}
