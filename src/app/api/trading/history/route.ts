import { usableFreeQuote, VERIFIED_MARKET_MESSAGE } from "@/domain/trading/market-availability";
import { z } from "zod";
import { TIMEFRAMES } from "@/domain/trading/market-data";
import { canonicalSymbol } from "@/domain/trading/models";
import { readCatalogue } from "@/services/trading/repository";
import { freeMarketData } from "@/services/trading/provider";
import { apiData, apiError, tradingIdentity } from "@/services/trading/http";
export async function GET(request: Request) {
  if (!await tradingIdentity()) return apiError("Sign in to view this market", 401);
  const params = new URL(request.url).searchParams;
  const input = z.object({ symbol: z.string().min(1).max(24), timeframe: z.enum(TIMEFRAMES) }).safeParse({ symbol: params.get("symbol"), timeframe: params.get("timeframe") });
  if (!input.success) return apiError("Invalid market or timeframe", 400);
  const catalogue = await readCatalogue();
  const instrument = catalogue.instruments.find(i => i.enabled !== false && i.symbol === canonicalSymbol(input.data.symbol) && i.asset_class !== "futures" && catalogue.classes.some(c => c.asset_class === i.asset_class && c.enabled));
  if (!instrument) return apiError("Market unavailable", 404);
  if (!usableFreeQuote(await freeMarketData.getQuote(instrument.symbol))) return apiError(VERIFIED_MARKET_MESSAGE, 403);
  return apiData(await freeMarketData.getHistoricalData(instrument.symbol, input.data.timeframe));
}
