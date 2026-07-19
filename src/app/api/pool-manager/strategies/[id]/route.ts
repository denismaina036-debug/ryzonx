import { NextResponse } from "next/server";
import { strategyService } from "@/services/strategy.service";
import type { UpdateStrategyInput } from "@/domain/investment/types";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient")
    ? 403
    : message.includes("not found")
      ? 404
      : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const strategy = await strategyService.getByIdForManager(id);
    return NextResponse.json({ strategy });
  } catch (error) {
    return errorResponse(error, "Failed to load strategy");
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as UpdateStrategyInput;
    const strategy = await strategyService.update(id, body);
    return NextResponse.json({ strategy });
  } catch (error) {
    return errorResponse(error, "Failed to update strategy");
  }
}
