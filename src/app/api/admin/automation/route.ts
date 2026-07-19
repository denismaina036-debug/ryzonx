import { NextResponse } from "next/server";
import { eventExplorerService } from "@/services/event-explorer.service";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient") ? 403 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const view = await eventExplorerService.getAutomationCenterView();
    return NextResponse.json({ view });
  } catch (error) {
    return errorResponse(error, "Failed to load automation center");
  }
}
