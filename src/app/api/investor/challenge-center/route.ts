import { NextResponse } from "next/server";
import { challengeCenterService } from "@/services/challenge-center.service";

export async function GET() {
  try {
    const state = await challengeCenterService.getChallengeCenterState();
    return NextResponse.json(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load challenge center";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
