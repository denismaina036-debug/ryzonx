import { NextResponse } from "next/server";
import { notificationQueueService } from "@/services/notification-queue.service";
import { webhookService } from "@/services/webhook.service";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient") ? 403 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const [queue, failedWebhooks] = await Promise.all([
      notificationQueueService.listPending(50),
      webhookService.listFailedDeliveries(20),
    ]);
    return NextResponse.json({ queue, failedWebhooks });
  } catch (error) {
    return errorResponse(error, "Failed to load queue");
  }
}
