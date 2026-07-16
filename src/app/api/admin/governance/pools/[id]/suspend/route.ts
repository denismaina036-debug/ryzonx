import { NextResponse } from "next/server";
import { poolGovernanceService } from "@/services/pool-governance.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    await poolGovernanceService.suspendPool({ fundId: id, reason: body.reason, notes: body.notes });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Suspension failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
