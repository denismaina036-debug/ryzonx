import { NextResponse } from "next/server";
import { poolGovernanceService } from "@/services/pool-governance.service";

export async function GET() {
  try {
    const data = await poolGovernanceService.getDashboard();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load dashboard.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
