import { NextResponse } from "next/server";
import { tradeSnapshotService } from "@/services/trade-snapshot.service";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status =
    message.includes("permissions") || message.includes("Insufficient")
      ? 403
      : message.includes("not found")
        ? 404
        : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { notes?: string };
    const snapshot = await tradeSnapshotService.createForCycle(id, body.notes);
    return NextResponse.json({ snapshot }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Failed to create snapshot");
  }
}
