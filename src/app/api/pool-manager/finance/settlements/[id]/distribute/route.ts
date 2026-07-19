import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { profitDistributionService } from "@/services/profit-distribution.service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const settlement = await profitDistributionService.distributeEarnings(id, user.id);
    return NextResponse.json({ settlement });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Distribution failed." },
      { status: 400 }
    );
  }
}
