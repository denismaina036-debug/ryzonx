import { NextResponse } from "next/server";
import { adminManagerOversightService } from "@/services/admin-manager-oversight.service";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient")
    ? 403
    : message.includes("not found")
      ? 404
      : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const profile = await adminManagerOversightService.getProfile(id);
    return NextResponse.json({ profile });
  } catch (error) {
    return errorResponse(error, "Failed to load manager oversight profile");
  }
}
