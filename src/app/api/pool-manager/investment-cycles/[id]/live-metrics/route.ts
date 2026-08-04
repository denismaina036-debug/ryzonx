import { NextResponse } from "next/server";
import { cycleLiveMetricsService } from "@/services/cycle-live-metrics.service";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient") ? 403 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const metrics = await cycleLiveMetricsService.getForPoolManager(id);
    return NextResponse.json({ metrics });
  } catch (error) {
    return errorResponse(error, "Failed to load live cycle metrics");
  }
}
