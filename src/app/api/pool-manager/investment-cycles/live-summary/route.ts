import { NextResponse } from "next/server";
import { cycleLiveMetricsService } from "@/services/cycle-live-metrics.service";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient") ? 403 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    const idsParam = new URL(request.url).searchParams.get("ids") ?? "";
    const cycleIds = idsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (cycleIds.length === 0) {
      return NextResponse.json({ summaries: [] });
    }

    const summaries = await cycleLiveMetricsService.getSummariesForPoolManager(cycleIds);
    return NextResponse.json({ summaries });
  } catch (error) {
    return errorResponse(error, "Failed to load cycle summaries");
  }
}
