import { NextResponse } from "next/server";
import { strategyService } from "@/services/strategy.service";
import type { StrategyStatus } from "@/constants/strategy";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient")
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
    const body = (await request.json()) as { status: StrategyStatus; reviewNote?: string };
    if (!body.status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }
    const strategy = await strategyService.adminReview(id, body.status, body.reviewNote);
    return NextResponse.json({ strategy });
  } catch (error) {
    return errorResponse(error, "Failed to transition strategy");
  }
}
