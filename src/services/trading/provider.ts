import "server-only";
import { MarketDataService, UnavailableMarketDataProvider } from "./market-data-service";
import { TwelveDataMarketDataProvider } from "./twelve-data";
import { BiQuoteMarketDataProvider } from "./biquote";
import { createHash } from "node:crypto";
import { validateFreeCatalogue } from "./biquote-catalogue";
import type { Instrument } from "@/domain/trading/models";

// Share cache and plan budget across route modules in the same server process.
const configuredProvider = process.env.TRADING_MARKET_DATA_PROVIDER ?? "none";
const key = process.env.TWELVE_DATA_API_KEY ?? "";
const limit = Number(process.env.TWELVE_DATA_CREDITS_PER_MINUTE ?? "8");
const signature=createHash("sha256").update(`${configuredProvider}:${key}:${limit}`).digest("hex");
const shared=globalThis as typeof globalThis & {ryvonxMarketData?:{signature:string;adapter:TwelveDataMarketDataProvider|BiQuoteMarketDataProvider|null;service:MarketDataService}};
if(shared.ryvonxMarketData?.signature!==signature) {
 const adapter=configuredProvider === "biquote" ? new BiQuoteMarketDataProvider() : configuredProvider === "twelve_data" && key ? new TwelveDataMarketDataProvider(key, undefined, Date.now, Number.isInteger(limit) && limit > 0 ? Math.min(limit, 1000) : 8) : null;
 shared.ryvonxMarketData={signature,adapter,service:new MarketDataService(adapter??new UnavailableMarketDataProvider())};
}
const adapter=shared.ryvonxMarketData!.adapter;
export const marketData = shared.ryvonxMarketData!.service;
// Public availability always probes the keyless provider, independently of the
// configured execution provider. Reuse its existing process cache when selected.
const publicShared = globalThis as typeof globalThis & { ryvonxFreeMarketData?: MarketDataService; ryvonxFreeAdapter?: BiQuoteMarketDataProvider; ryvonxDiscovery?: { expires: number; instruments: Instrument[]; pending?: Promise<Instrument[]> } };
const freeAdapter = adapter instanceof BiQuoteMarketDataProvider ? adapter : (publicShared.ryvonxFreeAdapter ??= new BiQuoteMarketDataProvider());
export const freeMarketData = adapter instanceof BiQuoteMarketDataProvider ? marketData
  : (publicShared.ryvonxFreeMarketData ??= new MarketDataService(freeAdapter));
export async function discoverFreeInstruments(): Promise<Instrument[]> {
  const state = publicShared.ryvonxDiscovery ??= { expires: 0, instruments: [] };
  if (state.pending) return state.pending;
  if (state.expires > Date.now()) return state.instruments;
  state.pending = (async () => {
    try {
      state.instruments = await validateFreeCatalogue(await freeAdapter.getInstruments(), freeMarketData);
      state.expires = Date.now() + (state.instruments.length ? 300_000 : 30_000);
    } catch { state.expires = Date.now() + 30_000; }
    return state.instruments;
  })().finally(() => { state.pending = undefined; });
  return state.pending;
}
export function providerStatus() {
  const fresh = adapter?.lastSuccessfulQuoteTime && Date.now() - Date.parse(adapter.lastSuccessfulQuoteTime) <= 60_000;
  return { name: adapter?.name ?? (configuredProvider === "twelve_data" ? "Twelve Data" : "Not connected"), connected: Boolean(fresh),
    status: !adapter ? "missing_configuration" as const : adapter.lastError ?? "stale_quote" as const,
    state: !adapter ? "Not Configured" : fresh ? "Connected" : "Error", lastSuccessfulQuoteTime: adapter?.lastSuccessfulQuoteTime ?? null };
}
