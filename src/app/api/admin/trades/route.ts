import { NextResponse } from "next/server";
import { tradeAdminService } from "@/services/trade-admin.service";
import type { CreateAdminTradeInput } from "@/services/trade-admin.service";

export async function GET() {
  try {
    const trades = await tradeAdminService.getTrades();
    return NextResponse.json({ trades });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load trades.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateAdminTradeInput;
    const trade = await tradeAdminService.createTrade(body);
    return NextResponse.json({ trade });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create trade.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
