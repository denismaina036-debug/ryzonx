import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { financialAdjustmentService } from "@/services/financial-adjustment.service";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes("permissions") || message.includes("Insufficient") ? 403 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const adjustments = await financialAdjustmentService.listOutstanding();
    return NextResponse.json({ adjustments });
  } catch (error) {
    return errorResponse(error, "Failed to load adjustments");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(USER_ROLES.ADMINISTRATOR);
    const body = (await request.json()) as {
      reason: string;
      amount: number;
      debitAccountId: string;
      creditAccountId: string;
    };
    const adjustment = await financialAdjustmentService.create({
      ...body,
      actorId: user.id,
    });
    return NextResponse.json({ adjustment });
  } catch (error) {
    return errorResponse(error, "Failed to create adjustment");
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireRole(USER_ROLES.ADMINISTRATOR);
    const body = (await request.json()) as { adjustmentId: string; action: "approve" | "reject" };
    if (!body.adjustmentId || !body.action) {
      return NextResponse.json({ error: "adjustmentId and action are required" }, { status: 400 });
    }
    const adjustment =
      body.action === "approve"
        ? await financialAdjustmentService.approveAndPost(body.adjustmentId, user.id)
        : await financialAdjustmentService.reject(body.adjustmentId, user.id);
    return NextResponse.json({ adjustment });
  } catch (error) {
    return errorResponse(error, "Failed to update adjustment");
  }
}
