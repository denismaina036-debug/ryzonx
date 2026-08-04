import { NextResponse } from "next/server";
import {
  investmentCycleService,
  type CloseInvestmentCycleAction,
} from "@/services/investment-cycle.service";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient")
    ? 403
    : message.includes("not found")
      ? 404
      : 400;
  return NextResponse.json({ error: message }, { status });
}

const CLOSE_ACTIONS: CloseInvestmentCycleAction[] = ["reopen_funding", "create_new_cycle"];

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    const action = body.action;

    if (!action || !CLOSE_ACTIONS.includes(action as CloseInvestmentCycleAction)) {
      return NextResponse.json(
        { error: "Close action must be reopen_funding or create_new_cycle." },
        { status: 400 }
      );
    }

    const result = await investmentCycleService.closeCycle(
      id,
      action as CloseInvestmentCycleAction,
      "manager"
    );
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "Failed to close investment cycle");
  }
}
