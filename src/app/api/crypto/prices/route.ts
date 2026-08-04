import { NextResponse } from "next/server";
import { cryptoPriceService } from "@/services/crypto-price.service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get("symbols") ?? "";
  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  if (symbols.length === 0) {
    return NextResponse.json({ error: "symbols query param required" }, { status: 400 });
  }

  const prices = await cryptoPriceService.getUsdPrices(symbols);
  const body: Record<string, number> = {};
  for (const symbol of symbols) {
    body[symbol] = prices.get(symbol) ?? 1;
  }

  return NextResponse.json({ prices: body });
}
