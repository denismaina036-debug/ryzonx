import { NextResponse } from "next/server";
import { tradeEntryService } from "@/services/trade-entry.service";
import type { CreateTradeEntryInput } from "@/domain/trading-journal/types";

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
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as CreateTradeEntryInput;
    const entry = await tradeEntryService.createDraft(id, body);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Failed to create trade entry");
  }
}
