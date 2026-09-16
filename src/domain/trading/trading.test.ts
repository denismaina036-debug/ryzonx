import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { calculateUnits, calculatePL, calculatePLPercent, positionValue, portfolioValue, decimal, decimalString } from "./calculations";
import { canonicalSymbol, matchesInstrument, settingsSchema, classSchema, instrumentControlsSchema, eligibility, type Instrument, type TradingSettings } from "./models";
import { normalizeQuote, quoteFreshness, executableQuote } from "./market-data";
import { ExecutionRouter, SimulationExecutionProvider } from "./execution";

const settings: TradingSettings = { trading_enabled: true, simulation_enabled: true, display_mode: "LIVE_PREVIEW", execution_mode: "SIMULATED" };
const instrument: Instrument = { id: "00000000-0000-4000-8000-000000000001", symbol: "EURUSD", provider_symbol: "EUR/USD", name: "Euro / US Dollar", asset_class: "forex", base_currency: "EUR", quote_currency: "USD", currency: "USD", exchange: null, price_precision: 5, quantity_precision: 8, minimum_trade_amount: "10", maximum_trade_amount: null, buy_enabled: true, sell_enabled: true, trading_enabled: true, featured: false, market_status: "unknown", display_order: 1, metadata: {}, created_at: "2026-09-09T00:00:00Z", updated_at: "2026-09-09T00:00:00Z" };
const now = Date.parse("2026-09-09T12:00:00Z");
const raw = { symbol: "EUR/USD", bid: "1.16", ask: "1.17", price: "1.165", change: "0.001", changePercent: "0.26", timestamp: "2026-09-09T11:59:30Z", marketOpen: true };
describe("instrument normalization", () => {
  it.each(["EUR/USD", "eurusd", " EUR_USD ", "EUR-USD"])("normalizes %s", symbol => expect(canonicalSymbol(symbol)).toBe("EURUSD"));
  it("searches names and aliases", () => { expect(matchesInstrument(instrument, "eur/usd")).toBe(true); expect(matchesInstrument(instrument, "Euro")).toBe(true); expect(matchesInstrument(instrument, "Bitcoin")).toBe(false); });
});
describe("deterministic 1x calculations", () => {
  it.each(["BUY", "SELL"])("calculates %s units", () => expect(calculateUnits("1000", "25")).toBe("40"));
  it("avoids floating-point drift", () => { expect(calculateUnits("0.3", "0.1")).toBe("3"); expect(decimalString(decimal("123456789012345678.123456789012"))).toBe("123456789012345678.123456789012"); });
  it("documents truncation at 12 places", () => expect(calculateUnits("1", "3")).toBe("0.333333333333"));
  it("calculates long gain and loss", () => { expect(calculatePL("BUY", "25", "27", "40")).toBe("80"); expect(calculatePL("BUY", "25", "20", "40")).toBe("-200"); });
  it("calculates short gain and loss", () => { expect(calculatePL("SELL", "25", "20", "40")).toBe("200"); expect(calculatePL("SELL", "25", "27", "40")).toBe("-80"); });
  it("reconciles PL, position value and portfolio", () => { expect(calculatePLPercent("80", "1000")).toBe("8"); expect(positionValue("1000", "80")).toBe("1080"); expect(portfolioValue("4000", ["1080"])).toBe("5080"); expect(portfolioValue("5080", [])).toBe("5080"); });
  it("rejects invalid financial inputs", () => { for (const value of ["0", "-1", "NaN", "1e4", "1.0000000000001"]) expect(() => calculateUnits(value, "10")).toThrow(); expect(() => calculateUnits("10", "0")).toThrow(); expect(() => calculatePLPercent("1", "0")).toThrow(); });
});
describe("quote integrity", () => {
  it("normalizes without synthesizing missing bid/ask", () => { expect(normalizeQuote(raw).symbol).toBe("EURUSD"); expect(normalizeQuote({ ...raw, bid: null, ask: null }).bid).toBeNull(); });
  it("rejects invalid timestamp, spread and prices", () => { for (const change of [{ timestamp: "bad" }, { price: "0" }, { price: "NaN" }, { bid: "2" }, { ask: "0" }]) expect(() => normalizeQuote({ ...raw, ...change })).toThrow(); });
  it("detects stale and future timestamps", () => { const quote = normalizeQuote(raw); expect(quoteFreshness(quote, now).ok).toBe(true); expect(quoteFreshness(quote, now + 31_000)).toEqual({ ok: false, error: "stale_quote" }); expect(quoteFreshness(quote, now - 60_000).ok).toBe(false); });
  it("keeps closed markets non-executable", () => expect(executableQuote(normalizeQuote({ ...raw, marketOpen: false }), now)).toEqual({ ok: false, error: "market_closed" }));
});
describe("admin and execution boundaries", () => {
  it.each(["SIMULATION", "LIVE_PREVIEW", "LIVE"])("display %s cannot enable live execution", display_mode => { expect(settingsSchema.parse({ ...settings, display_mode }).execution_mode).toBe("SIMULATED"); expect(settingsSchema.safeParse({ ...settings, display_mode, execution_mode: "LIVE" }).success).toBe(false); });
  it("rejects futures and contradictory limits", () => { expect(classSchema.safeParse({ asset_class: "futures", enabled: true }).success).toBe(false); expect(instrumentControlsSchema.safeParse({ trading_enabled: true, buy_enabled: true, sell_enabled: true, featured: false, minimum_trade_amount: "100", maximum_trade_amount: "10", display_order: 0 }).success).toBe(false); });
  it("blocks disabled asset classes and sides", () => { expect(eligibility(settings, [], instrument, "BUY")).toContain("class"); expect(eligibility(settings, [{ asset_class: "forex", enabled: true }], { ...instrument, buy_enabled: false }, "BUY")).toContain("BUY"); expect(eligibility(settings, [{ asset_class: "forex", enabled: true }], { ...instrument, sell_enabled: false }, "SELL")).toContain("SELL"); expect(eligibility({ ...settings, trading_enabled: false }, [], instrument, "BUY")).toContain("disabled"); });
  it("routes simulation through the atomic store and cannot switch to LIVE", async () => {
    const rpc=vi.fn(async()=>"position");
    const router=new ExecutionRouter(new SimulationExecutionProvider({rpc}));
    const command={userId:"user",request:{instrument:instrument.id,side:"BUY" as const,amount:"100",stopLoss:null,takeProfit:null,idempotencyKey:"key"},quote:normalizeQuote(raw)};
    await router.open(command);expect(rpc).toHaveBeenCalledWith("open_simulation_position",expect.objectContaining({p_user:"user",p_amount:"100"}));
    expect(()=>router.open(command,"LIVE")).toThrow("environment");
  });
});
