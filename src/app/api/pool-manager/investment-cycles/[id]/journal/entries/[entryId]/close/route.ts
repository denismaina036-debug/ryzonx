import { NextResponse } from "next/server";
import { tradeEntryService } from "@/services/trade-entry.service";
import type { CloseTradeEntryInput } from "@/domain/trading-journal/types";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status =
    message.includes("permissions") || message.includes("Insufficient")
      ? 403
      : message.includes("not found")
        ? 404
        : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { entryId } = await context.params;
    const body = (await request.json()) as CloseTradeEntryInput;
    const entry = await tradeEntryService.closeTrade(entryId, body);
    return NextResponse.json({ entry });
  } catch (error) {
    return errorResponse(error, "Failed to close trade");
  }
}
