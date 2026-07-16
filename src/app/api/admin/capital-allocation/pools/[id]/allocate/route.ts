import { NextResponse } from "next/server";
import { poolCapitalAllocationService } from "@/services/pool-capital-allocation.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    await poolCapitalAllocationService.allocateCapital({
      fundId: id,
      amount: body.amount,
      reviewNotes: body.reviewNotes,
      nextReviewAt: body.nextReviewAt,
      grantBackedBadge: body.grantBackedBadge,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 400 });
  }
}
