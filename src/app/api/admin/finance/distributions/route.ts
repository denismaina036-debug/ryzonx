import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { distributionService } from "@/services/distribution.service";
import type { DistributionRecordStatus } from "@/constants/ledger";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient") ? 403 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const records = await distributionService.listPending();
    return NextResponse.json({ records });
  } catch (error) {
    return errorResponse(error, "Failed to load distributions");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(USER_ROLES.ADMINISTRATOR);
    const body = (await request.json()) as { cycleId: string; batchId?: string };
    if (!body.cycleId) {
      return NextResponse.json({ error: "cycleId is required" }, { status: 400 });
    }
    const records = await distributionService.prepareForCycle(body.cycleId, user.id, body.batchId);
    return NextResponse.json({ records });
  } catch (error) {
    return errorResponse(error, "Failed to prepare distribution");
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireRole(USER_ROLES.ADMINISTRATOR);
    const body = (await request.json()) as { recordId: string; status: DistributionRecordStatus };
    if (!body.recordId || !body.status) {
      return NextResponse.json({ error: "recordId and status are required" }, { status: 400 });
    }
    const record = await distributionService.advanceStatus(body.recordId, body.status, user.id);
    return NextResponse.json({ record });
  } catch (error) {
    return errorResponse(error, "Failed to update distribution");
  }
}
