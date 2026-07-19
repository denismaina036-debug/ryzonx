import { NextResponse } from "next/server";
import type { StrategyStatus } from "@/constants/strategy";
import { strategyService } from "@/services/strategy.service";

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
    const body = (await request.json()) as { status: StrategyStatus };
    if (!body.status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }
    const strategy = await strategyService.transition(id, body.status, "manager");
    return NextResponse.json({ strategy });
  } catch (error) {
    return errorResponse(error, "Failed to transition strategy");
  }
}
