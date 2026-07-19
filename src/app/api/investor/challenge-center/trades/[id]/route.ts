import { NextResponse } from "next/server";
import { challengeTradeService } from "@/services/challenge-trade.service";
import { challengeCenterService } from "@/services/challenge-center.service";
import type { UpdateChallengeTradeInput } from "@/domain/challenge/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as UpdateChallengeTradeInput;
    const trade = await challengeTradeService.updateRejectedTrade(id, body);
    const state = await challengeCenterService.getChallengeCenterState();
    return NextResponse.json({ trade, state });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
