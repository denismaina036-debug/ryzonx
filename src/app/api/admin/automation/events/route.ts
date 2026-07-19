import { NextResponse } from "next/server";
import { eventExplorerService } from "@/services/event-explorer.service";
import type { PlatformEventCategory, PlatformEventStatus } from "@/constants/platform-events";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient") ? 403 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const events = await eventExplorerService.explore({
      eventType: searchParams.get("eventType") ?? undefined,
      category: (searchParams.get("category") as PlatformEventCategory) ?? undefined,
      status: (searchParams.get("status") as PlatformEventStatus) ?? undefined,
      entityType: searchParams.get("entityType") ?? undefined,
      entityId: searchParams.get("entityId") ?? undefined,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : 50,
    });
    return NextResponse.json({ events });
  } catch (error) {
    return errorResponse(error, "Failed to load events");
  }
}
