import { NextResponse } from "next/server";
import { strategyService } from "@/services/strategy.service";
import type { StrategyStatus } from "@/constants/strategy";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient")
    ? 403
    : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as StrategyStatus | null;
    const strategies = await strategyService.listAll(
      status ? { status } : undefined
    );
    return NextResponse.json({ strategies });
  } catch (error) {
    return errorResponse(error, "Failed to load strategies");
  }
}
