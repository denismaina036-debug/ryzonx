import { NextResponse } from "next/server";
import { poolGovernanceService } from "@/services/pool-governance.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const detail = await poolGovernanceService.getPoolDetail(id);
    return NextResponse.json(detail);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load pool governance.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const action = body.action as string;

    switch (action) {
      case "stage":
        await poolGovernanceService.setGovernanceStage({ fundId: id, stage: body.stage, notes: body.notes });
        break;
      case "restrictions":
        await poolGovernanceService.setRestrictions({ fundId: id, ...body });
        break;
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Action failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
