import { NextResponse } from "next/server";
import { poolEcosystemService } from "@/services/pool-ecosystem.service";

export async function GET() {
  try {
    const pool = await poolEcosystemService.getDefaultPool();
    const roi = await poolEcosystemService.getPoolRoi(pool.id);
    return NextResponse.json({ pool, roi });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load default pool.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
