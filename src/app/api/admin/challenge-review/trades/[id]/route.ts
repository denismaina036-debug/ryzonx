import { NextResponse } from "next/server";
import { challengeTradeService } from "@/services/challenge-trade.service";
import { challengeCenterService } from "@/services/challenge-center.service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      action: "approve" | "reject";
      reviewNotes?: string;
      rejectionReason?: string;
      enrollmentId?: string;
    };

    if (!body.action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    const trade = await challengeTradeService.reviewTrade({
      tradeId: id,
      action: body.action,
      reviewNotes: body.reviewNotes,
      rejectionReason: body.rejectionReason,
    });

    let state = null;
    if (body.enrollmentId) {
      state = await challengeCenterService.getAdminReviewState(body.enrollmentId);
    }

    return NextResponse.json({ trade, state });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Review failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
