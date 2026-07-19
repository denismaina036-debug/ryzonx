import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { settlementService } from "@/services/settlement.service";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient") ? 403 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const [pending, history] = await Promise.all([
      settlementService.listPendingBatches(),
      settlementService.listBatchHistory(50),
    ]);
    return NextResponse.json({ pending, history });
  } catch (error) {
    return errorResponse(error, "Failed to load settlements");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(USER_ROLES.ADMINISTRATOR);
    const body = (await request.json()) as { cycleId: string; notes?: string };
    if (!body.cycleId) {
      return NextResponse.json({ error: "cycleId is required" }, { status: 400 });
    }
    const batch = await settlementService.createSettlementBatch(body.cycleId, user.id, body.notes);
    return NextResponse.json({ batch });
  } catch (error) {
    return errorResponse(error, "Failed to create settlement batch");
  }
}
