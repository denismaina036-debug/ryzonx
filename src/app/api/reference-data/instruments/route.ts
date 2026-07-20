import { NextResponse } from "next/server";
import { referenceDataService } from "@/services/reference-data.service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const marketsParam = searchParams.get("markets") ?? "";
    const markets = marketsParam
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);

    const items = await referenceDataService.getInstrumentsForMarkets(markets);
    return NextResponse.json({ markets, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load instruments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
