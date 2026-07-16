import { NextResponse } from "next/server";
import { challengeService } from "@/services/challenge.service";

export async function GET() {
  try {
    const state = await challengeService.getInvestorChallengeState();
    return NextResponse.json(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load challenge";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
