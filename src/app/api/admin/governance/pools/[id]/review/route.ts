import { NextResponse } from "next/server";
import { poolGovernanceService } from "@/services/pool-governance.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    await poolGovernanceService.createReview({ fundId: id, ...body });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Review failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
