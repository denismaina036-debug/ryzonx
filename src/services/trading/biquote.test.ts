import { describe, expect, it, vi } from "vitest";
import { BiQuoteMarketDataProvider, normalizeBiQuote } from "./biquote";
import { MarketDataService } from "./market-data-service";
import { quoteFreshness } from "@/domain/trading/market-data";

const now = Date.parse("2026-09-10T14:44:11Z");
const tick = { symbol: "XAUUSD", bid: 4358.834, ask: 4359.016, mid: 4358.925, last: 0,
  dayDiffPercent: 0.2017, timestamp: new Date(now).toISOString(), lastQuoteAt: new Date(now).toISOString(),
  stale: false, quoteAgeSeconds: 0, marketState: "open" };
describe("BiQuote market data", () => {
  it.skipIf(process.env.BIQUOTE_LIVE_CHECK !== "1")("retrieves the five verified instruments through the real shared service", async () => {
    const service = new MarketDataService(new BiQuoteMarketDataProvider());
    const expected = { XAUUSD: "XAUUSD", BTCUSD: "BTCUSD", EURUSD: "EURUSD", SPX500: "US500", NAS100: "USTEC" };
    const quotes = await service.getQuotes(Object.keys(expected));
    console.info(JSON.stringify(Object.entries(quotes).map(([symbol, result]) => result.ok ? { symbol, providerSymbol: result.data.providerSymbol, bid: result.data.bid, ask: result.data.ask, price: result.data.price, timestamp: result.data.timestamp, marketState: result.data.marketState, fresh: true } : { symbol, error: result.error })));
    for (const [symbol, providerSymbol] of Object.entries(expected)) expect(quotes[symbol]).toMatchObject({ ok: true, data: { symbol, providerSymbol, source: "biquote" } });
  }, 15000);
  it("normalizes bid, ask, mid and daily change without inventing absolute change", () => {
    const result = normalizeBiQuote("XAUUSD", tick);
    expect(result).toMatchObject({ ok: true, data: { symbol: "XAUUSD", providerSymbol: "XAUUSD", source: "biquote",
      bid: "4358.834", ask: "4359.016", price: "4358.925", change: null, changePercent: "0.2017", marketOpen: true, stale: false } });
  });
  it("derives a midpoint only from actual bid and ask, never zero last", () => {
    expect(normalizeBiQuote("XAUUSD", { ...tick, mid: undefined })).toMatchObject({ ok: true, data: { price: "4358.925" } });
    expect(normalizeBiQuote("XAUUSD", { ...tick, mid: undefined, bid: null, ask: null }).ok).toBe(false);
  });
  it.each([["SPX500", "US500"], ["US500", "US500"], ["NAS100", "USTEC"]])("maps %s to %s while retaining canonical identity", (canonical, alias) => {
    expect(normalizeBiQuote(canonical, { ...tick, symbol: alias })).toMatchObject({ ok: true, data: { symbol: canonical, providerSymbol: alias } });
    expect(normalizeBiQuote(canonical, { ...tick, symbol: "UNRELATED" }).ok).toBe(false);
  });
  it("preserves known closed/unknown market states and hides ended-session changes", () => {
    expect(normalizeBiQuote("XAUUSD", { ...tick, marketState: "closed" })).toMatchObject({ ok: true, data: { marketOpen: false, marketStatusKnown: true, marketState: "closed", changePercent: null } });
    expect(normalizeBiQuote("XAUUSD", { ...tick, marketState: undefined })).toMatchObject({ ok: true, data: { marketOpen: false, marketStatusKnown: false, marketState: "unknown" } });
  });
  it.each([{ stale: true }, { quoteAgeSeconds: 61 }, { lastQuoteAt: new Date(now - 61000).toISOString() }, { lastQuoteAt: new Date(now + 6000).toISOString() }])("rejects stale or future quotes: %j", async override => {
    const request = vi.fn(async () => new Response(JSON.stringify({ XAUUSD: { ...tick, ...override } })));
    expect(await new MarketDataService(new BiQuoteMarketDataProvider(request, () => now), () => now).getQuote("XAUUSD")).toEqual({ ok: false, error: "stale_quote" });
  });
  it("rechecks cached freshness without another network call", async () => {
    let time = now;
    const request = vi.fn(async () => new Response(JSON.stringify({ XAUUSD: { ...tick, lastQuoteAt: new Date(now - 55000).toISOString() } })));
    const service = new MarketDataService(new BiQuoteMarketDataProvider(request, () => time), () => time);
    expect((await service.getQuote("XAUUSD")).ok).toBe(true); time += 6000;
    expect(await service.getQuote("XAUUSD")).toEqual({ ok: false, error: "stale_quote" }); expect(request).toHaveBeenCalledTimes(1);
  });
  it("uses one keyless batch request with repeated symbols and service caching", async () => {
    const request = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ XAUUSD: tick, USTEC: { ...tick, symbol: "USTEC" } })));
    const service = new MarketDataService(new BiQuoteMarketDataProvider(request, () => now), () => now);
    const results = await service.getQuotes(["XAUUSD", "NAS100", "XAUUSD"]);
    expect(results.NAS100).toMatchObject({ ok: true, data: { providerSymbol: "USTEC" } });
    await service.getQuote("XAUUSD"); expect(request).toHaveBeenCalledTimes(1);
    const url = new URL(String(request.mock.calls[0]?.[0]));
    expect(url.searchParams.getAll("symbols")).toEqual(["USTEC", "XAUUSD"]);
    expect(url.searchParams.has("apikey")).toBe(false);
  });
  it("rejects malformed prices, inverted spreads and invalid timestamps", () => {
    for (const override of [{ bid: 5000 }, { mid: 0 }, { mid: "NaN" }, { lastQuoteAt: "bad" }, { stale: "false" }, { quoteAgeSeconds: -1 }]) expect(normalizeBiQuote("XAUUSD", { ...tick, ...override }).ok).toBe(false);
  });
  it("marks missing/unsupported symbols unavailable", async () => {
    const request = vi.fn(async () => new Response("{}")); const provider = new BiQuoteMarketDataProvider(request, () => now);
    expect(await provider.getQuote("XAUUSD")).toEqual({ ok: false, error: "unknown_instrument" });
    expect(await provider.getQuote("NOTSUPPORTED")).toEqual({ ok: false, error: "unknown_instrument" }); expect(request).toHaveBeenCalledTimes(2);
  });
  it("honors Retry-After beyond the shared service cooldown", async () => {
    let time = now;
    const request = vi.fn(async () => new Response("{}", { status: 429, headers: { "Retry-After": "120" } }));
    const provider = new BiQuoteMarketDataProvider(request, () => time);
    expect(await provider.getQuote("XAUUSD")).toEqual({ ok: false, error: "rate_limited" }); time += 61000;
    await provider.getQuote("XAUUSD"); expect(request).toHaveBeenCalledTimes(1);
  });
  it("sanitizes network and server errors", async () => {
    for (const request of [vi.fn(async () => { throw new Error("private upstream details"); }), vi.fn(async () => new Response("private upstream details", { status: 500 }))]) {
      const result = await new BiQuoteMarketDataProvider(request, () => now).getQuote("XAUUSD"); expect(result.ok).toBe(false); expect(JSON.stringify(result)).not.toContain("private");
    }
  });
  it("normalizes actual OHLC envelope into ascending history", async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({ symbol: "XAUUSD", bars: [{ openTime: "2026-09-10T14:40:00Z", close: 4359 }, { openTime: "2026-09-10T14:35:00Z", close: 4358 }] })));
    const result = await new MarketDataService(new BiQuoteMarketDataProvider(request, () => now), () => now).getHistoricalData("XAUUSD", "1D");
    expect(result).toEqual({ ok: true, data: [{ timestamp: "2026-09-10T14:35:00.000Z", price: "4358" }, { timestamp: "2026-09-10T14:40:00.000Z", price: "4359" }] });
  });
  it("leaves Twelve Data quote freshness semantics intact", () => {
    const normalized = normalizeBiQuote("XAUUSD", tick);
    if (!normalized.ok) throw new Error("test setup");
    expect(quoteFreshness({ ...normalized.data, source: "twelve_data", stale: undefined }, now).ok).toBe(true);
  });
});
