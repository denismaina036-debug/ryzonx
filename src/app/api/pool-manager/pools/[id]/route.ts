import { NextResponse } from "next/server";
import { poolManagerDashboardService } from "@/services/pool-manager-dashboard.service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;

    if (body.submit === true) {
      await poolManagerDashboardService.submitPoolForReview(id);
      return NextResponse.json({ success: true });
    }

    await poolManagerDashboardService.updatePoolDraft(id, {
      name: body.name as string | undefined,
      description: body.description as string | undefined,
      poolDescription: body.poolDescription as string | undefined,
      minInvestment: body.minInvestment as number | undefined,
      maxInvestment: body.maxInvestment as number | undefined,
      coverImageUrl: body.coverImageUrl as string | undefined,
      cardBackgroundColor: body.cardBackgroundColor as string | undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
