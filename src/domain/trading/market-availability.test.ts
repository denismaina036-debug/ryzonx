import { describe, expect, it, vi } from "vitest";
import { usableFreeQuote } from "./market-availability";
import { BiQuoteMarketDataProvider } from "@/services/trading/biquote";
import { MarketDataService } from "@/services/trading/market-data-service";

describe("automatic free market availability", () => {
  it("retries unmapped instruments and changes access in both directions", async () => {
    let now = Date.now(), available = false;
    const request = vi.fn(async () => new Response(JSON.stringify(available ? { GBPUSD: {
      symbol: "GBPUSD", bid: 1.3, ask: 1.31, mid: 1.305,
      lastQuoteAt: new Date(now).toISOString(), marketState: "open",
    } } : {})));
    const service = new MarketDataService(new BiQuoteMarketDataProvider(request, () => now), () => now);
    expect(usableFreeQuote(await service.getQuote("GBPUSD"), now)).toBeNull();
    available = true; now += 30_001;
    const result = await service.getQuote("GBPUSD");
    expect(usableFreeQuote(result, now)?.price).toBe("1.305");
    expect(usableFreeQuote(result, now + 60_001)).toBeNull();
    if (result.ok) expect(usableFreeQuote({ ok: true, data: { ...result.data, source: "twelve_data" } }, now)).toBeNull();
    available = false; now += 15_001;
    expect(usableFreeQuote(await service.getQuote("GBPUSD"), now)).toBeNull();
    expect(request).toHaveBeenCalledTimes(3);
  });
  it("does not confuse market closure with missing data", () => {
    expect(usableFreeQuote({ ok: true, data: { symbol: "BTCUSD", source: "biquote", price: "100", bid: null, ask: null, change: null, changePercent: null, marketOpen: false, timestamp: new Date().toISOString() } })).not.toBeNull();
  });
});
