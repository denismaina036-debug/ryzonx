import { NextResponse } from "next/server";
import { poolGovernanceService } from "@/services/pool-governance.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const violationId = await poolGovernanceService.recordViolation({
      fundId: id,
      ruleKey: body.ruleKey,
      ruleName: body.ruleName,
      actualValue: body.actualValue,
      expectedValue: body.expectedValue,
      severity: body.severity,
      adminNotes: body.adminNotes,
    });
    return NextResponse.json({ id: violationId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Violation recording failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
