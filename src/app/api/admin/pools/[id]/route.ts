import { NextResponse } from "next/server";
import { poolAdminService } from "@/services/pool-admin.service";
import type { ReturnTier } from "@/features/investor/types/account";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Partial<{
      name: string;
      description: string;
      poolDescription: string;
      tradingPair: string;
      poolDurationDays: number;
      minInvestment: number;
      maxInvestment: number | null;
      targetCapital: number;
      profitTargetPct: number;
      targetInvestors: number;
      returnTiers: ReturnTier[];
      isInviteOnly: boolean;
      status: string;
      cardBackgroundColor: string | null;
      poolManagerName: string | null;
      poolManagerIconUrl: string | null;
      additionalCapital: number;
    }>;

    const fund = await poolAdminService.updateFund(id, body);
    return NextResponse.json(fund);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await poolAdminService.deleteFund(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
