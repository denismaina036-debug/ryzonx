import { NextResponse } from "next/server";
import { poolManagerGrowthService } from "@/services/pool-manager-growth.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await poolManagerGrowthService.awardAchievement(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 400 });
  }
}
