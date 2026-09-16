import { describe, expect, it, vi } from "vitest";
import { normalizeBiQuoteCatalogue, newCatalogueInstruments, validateFreeCatalogue } from "./biquote-catalogue";
import { BiQuoteMarketDataProvider } from "./biquote";
import { MarketDataService } from "./market-data-service";

const metadata = (name: string, type = "Forex") => ({ name, type, description: name, digits: 5, currency: "USD", exchange: "FOREX" });
describe("provider-driven catalogue", () => {
  it("imports arbitrary provider pairs with their actual quote currencies and stable IDs", () => {
    const first = normalizeBiQuoteCatalogue([metadata("NZDSGD"), metadata("USDJPY"), metadata("BTCXAU", "Crypto")]);
    expect(first.map(i => i.quote_currency)).toEqual(["XAU", "SGD", "JPY"]);
    expect(first.map(i => i.id)).toEqual(normalizeBiQuoteCatalogue([metadata("NZDSGD"), metadata("USDJPY"), metadata("BTCXAU", "Crypto")]).map(i => i.id));
    expect(first.every(i => !i.trading_enabled && i.market_status === "unknown")).toBe(true);
  });
  it("preserves canonical index names and keeps scaled variants distinct", () => {
    const rows = normalizeBiQuoteCatalogue([metadata("US500", "Index"), metadata("USTEC", "Index"), metadata("US30", "Index"), metadata("US500_X100", "Index"), metadata("FAKE", "Unknown"), { ...metadata("EURUSD"), digits: 99 }]);
    expect(rows.map(i => [i.symbol, i.provider_symbol])).toEqual([["DJ30", "US30"], ["NAS100", "USTEC"], ["SPX500", "US500"], ["US500X100", "US500_X100"]]);
    expect(rows[3]!.name).toContain("US500_X100");
    expect(() => normalizeBiQuoteCatalogue({})).toThrow();
  });
  it("retains existing disabled records rather than replacing their settings", () => {
    const discovered = normalizeBiQuoteCatalogue([metadata("EURUSD"), metadata("NZDSGD")]);
    const existing = [{ ...discovered[0]!, enabled: false }];
    expect(newCatalogueInstruments(existing, discovered).map(i => i.symbol)).toEqual(["NZDSGD"]);
    expect(existing[0]!.enabled).toBe(false);
  });
  it("uses the public catalogue endpoint and validates quotes before import", async () => {
    const now = Date.now();
    const request = vi.fn(async (url: string | URL | Request) => new Response(JSON.stringify(String(url).includes('/symbols?') ? [metadata("NZDSGD"), metadata("USDJPY")] : {
      NZDSGD: { symbol: "NZDSGD", mid: 0.8, lastQuoteAt: new Date(now).toISOString(), marketState: "open" },
      USDJPY: { symbol: "USDJPY", mid: 150, lastQuoteAt: "2000-01-01T00:00:00Z", stale: true },
    })));
    const provider = new BiQuoteMarketDataProvider(request, () => now);
    expect((await validateFreeCatalogue(await provider.getInstruments(), new MarketDataService(provider, () => now), () => now)).map(i => i.symbol)).toEqual(["NZDSGD"]);
    expect(String(request.mock.calls[0]![0])).toContain("symbols?quotedWithinDays=7");
  });
  it.runIf(process.env.BIQUOTE_CATALOGUE_LIVE === "1")("verifies current category totals through the real provider service", async () => {
    const provider = new BiQuoteMarketDataProvider();
    const candidates = await provider.getInstruments();
    const instruments = await validateFreeCatalogue(candidates, new MarketDataService(provider));
    expect(instruments.some(i => i.asset_class === "forex")).toBe(true);
    console.log(JSON.stringify({ checkedAt: new Date().toISOString(), candidates: candidates.length, available: instruments.reduce<Record<string, number>>((counts, i) => ({ ...counts, [i.asset_class]: (counts[i.asset_class] ?? 0) + 1 }), {}), unavailable: candidates.filter(i => !instruments.some(v => v.symbol === i.symbol)).map(i => i.symbol) }));
  }, 60000);
});
