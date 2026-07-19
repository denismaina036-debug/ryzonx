import { NextResponse } from "next/server";
import { notificationQueueService } from "@/services/notification-queue.service";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient") ? 403 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await notificationQueueService.retryFailed(id);
    await notificationQueueService.processPending(1);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Retry failed");
  }
}
