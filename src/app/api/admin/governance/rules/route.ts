import { NextResponse } from "next/server";
import { poolGovernanceService } from "@/services/pool-governance.service";

export async function GET() {
  try {
    const rules = await poolGovernanceService.listRules();
    return NextResponse.json(rules);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load rules.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    await poolGovernanceService.upsertRule(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
