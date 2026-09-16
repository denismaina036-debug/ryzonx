import { describe, expect, it, vi } from "vitest";
import { MarketDataService, UnavailableMarketDataProvider } from "./market-data-service";
import type { MarketDataProvider, Quote } from "@/domain/trading/market-data";

const now = Date.parse("2026-09-09T12:00:00Z");
const quote: Quote = { symbol: "BTCUSD", price: "100", bid: null, ask: null, change: null, changePercent: null, timestamp: new Date(now).toISOString(), marketOpen: true };
function provider(getQuotes: MarketDataProvider["getQuotes"]): MarketDataProvider {
  return { name: "test adapter", getQuotes, getQuote: async () => ({ ok: true, data: quote }), getHistoricalData: async () => ({ ok: false, error: "provider_unavailable" }), getMarketStatus: async () => ({ ok: false, error: "provider_unavailable" }) };
}
describe("market-data service", () => {
  it("batches, canonicalizes, deduplicates and caches requests", async () => {
    const fetch = vi.fn(async () => ({ BTCUSD: { ok: true as const, data: quote } }));
    const service = new MarketDataService(provider(fetch), () => now);
    const [first, second] = await Promise.all([service.getQuotes(["BTC/USD", "BTCUSD"]), service.getQuotes(["BTCUSD"])]);
    await service.getQuote("BTCUSD");
    expect(fetch).toHaveBeenCalledTimes(1); expect(fetch).toHaveBeenCalledWith(["BTCUSD"]); expect(first).toEqual(second);
  });
  it("fails safely without credentials", async () => expect(await new MarketDataService(new UnavailableMarketDataProvider()).getQuote("BTCUSD")).toEqual({ ok: false, error: "missing_configuration" }));
  it("rejects stale and mismatched quotes", async () => {
    const stale = new MarketDataService(provider(async () => ({ BTCUSD: { ok: true, data: quote } })), () => now + 61_000);
    expect(await stale.getQuote("BTCUSD")).toEqual({ ok: false, error: "stale_quote" });
    const mismatched = new MarketDataService(provider(async () => ({ ETHUSD: { ok: true, data: quote } })), () => now);
    expect(await mismatched.getQuote("ETHUSD")).toEqual({ ok: false, error: "unknown_instrument" });
  });
  it("handles network failure and unknown instruments", async () => {
    expect(await new MarketDataService(provider(async () => { throw new Error("secret upstream error"); })).getQuote("BTCUSD")).toEqual({ ok: false, error: "network_error" });
    expect(await new MarketDataService(provider(async () => ({}))).getQuote("NOPE")).toEqual({ ok: false, error: "unknown_instrument" });
  });
  it("backs off across requests after a rate limit", async () => {
    const fetch = vi.fn(async () => ({ BTCUSD: { ok: false as const, error: "rate_limited" as const } }));
    const service = new MarketDataService(provider(fetch), () => now);
    await service.getQuote("BTCUSD"); expect(await service.getQuote("ETHUSD")).toEqual({ ok: false, error: "rate_limited" }); expect(fetch).toHaveBeenCalledTimes(1);
  });
});
