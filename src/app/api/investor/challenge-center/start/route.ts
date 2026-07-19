import { NextResponse } from "next/server";
import { challengeCenterService } from "@/services/challenge-center.service";

export async function POST() {
  try {
    const state = await challengeCenterService.startChallenge();
    return NextResponse.json(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start challenge";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
