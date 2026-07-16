import { NextResponse } from "next/server";
import { poolManagerGrowthService } from "@/services/pool-manager-growth.service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    await poolManagerGrowthService.reviewContent({
      contentId: id,
      approve: body.approve,
      reviewNotes: body.reviewNotes,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 400 });
  }
}
