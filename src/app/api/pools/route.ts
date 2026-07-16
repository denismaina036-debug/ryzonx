import { NextResponse } from "next/server";
import { poolEcosystemService } from "@/services/pool-ecosystem.service";

export async function GET() {
  try {
    const [pools, summary] = await Promise.all([
      poolEcosystemService.listActivePools(),
      poolEcosystemService.getArchitectureSummary(),
    ]);
    return NextResponse.json({ pools, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load pools.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
