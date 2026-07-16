import { NextResponse } from "next/server";
import { poolAdminService } from "@/services/pool-admin.service";
import type { ReturnTier } from "@/features/investor/types/account";

export async function GET() {
  try {
    const funds = await poolAdminService.getFunds();
    const investors = await poolAdminService.getInvestorsForInvite();
    return NextResponse.json({ funds, investors });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load pools.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name: string;
      description: string;
      poolDescription: string;
      tradingPair: string;
      poolDurationDays: number;
      minInvestment: number;
      maxInvestment?: number | null;
      targetCapital: number;
      profitTargetPct: number;
      targetInvestors: number;
      returnTiers: ReturnTier[];
      isInviteOnly?: boolean;
      status?: string;
      cardBackgroundColor?: string | null;
      poolManagerName?: string | null;
      poolManagerIconUrl?: string | null;
    };
    const fund = await poolAdminService.createFund(body);
    return NextResponse.json(fund);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
