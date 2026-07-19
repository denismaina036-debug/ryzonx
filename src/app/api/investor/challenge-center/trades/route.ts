import { NextResponse } from "next/server";
import { challengeCenterService } from "@/services/challenge-center.service";
import { challengeTradeService } from "@/services/challenge-trade.service";
import type { CreateChallengeTradeInput } from "@/domain/challenge/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateChallengeTradeInput & {
      enrollmentId: string;
    };

    if (!body.enrollmentId) {
      return NextResponse.json({ error: "enrollmentId is required" }, { status: 400 });
    }

    const trade = await challengeTradeService.createTrade(body.enrollmentId, body);
    const state = await challengeCenterService.getChallengeCenterState();
    return NextResponse.json({ trade, state });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not submit trade";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
