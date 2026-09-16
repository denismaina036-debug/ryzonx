import type { DataResult, Quote } from "@/domain/trading/market-data";
import { readCatalogue } from "@/services/trading/repository";
import { freeMarketData } from "@/services/trading/provider";
import { apiData, apiError, tradingIdentity } from "@/services/trading/http";

export async function GET(request: Request) {
  if (!await tradingIdentity()) return apiError("Sign in to explore markets", 401);
  const catalogue = await readCatalogue();
  const instruments = catalogue.instruments.filter(i => i.enabled !== false && i.asset_class !== "futures" && catalogue.classes.some(c => c.asset_class === i.asset_class && c.enabled));
  const requested = new URL(request.url).searchParams.get("symbol");
  const symbols = instruments.filter(i => !requested || i.symbol === requested).map(i => i.symbol);
  const quotes: Record<string, DataResult<Quote>> = Object.assign({}, ...await Promise.all(Array.from({ length: Math.ceil(symbols.length / 100) }, (_, index) => freeMarketData.getQuotes(symbols.slice(index * 100, (index + 1) * 100)))));
  // Provider mappings and arbitrary metadata remain server-only for customers.
  return apiData({ ...catalogue, instruments: instruments.map(({ provider_symbol: _provider, metadata: _metadata, ...instrument }) => instrument), quotes, provider: { name: freeMarketData.providerName, connected: Object.values(quotes).some(result => result.ok), status: "provider_unavailable" } });
}
