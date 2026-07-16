import { NextResponse } from "next/server";
import { poolGovernanceService } from "@/services/pool-governance.service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    await poolGovernanceService.updateViolationStatus({
      violationId: id,
      status: body.status,
      adminNotes: body.adminNotes,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
