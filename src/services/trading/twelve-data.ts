import type { DataResult, HistoricalPoint, MarketDataError, MarketDataProvider, Quote, Timeframe } from "@/domain/trading/market-data";
import { normalizeQuote } from "@/domain/trading/market-data";
import { get } from "node:https";
// Avoid Next's fetch instrumentation: URLs contain the server credential.
const privateRequest: typeof fetch = async (input) => new Promise((resolve,reject)=>{
  const req=get(String(input),res=>{let body="";res.setEncoding("utf8");res.on("data",chunk=>{body+=chunk;if(body.length>2_000_000)req.destroy(new Error("Provider response too large"));});res.on("end",()=>resolve(new Response(body,{status:res.statusCode??503})));res.on("error",()=>reject(new Error("Provider unavailable")));});
  req.setTimeout(10_000,()=>req.destroy(new Error("Provider timeout")));
  req.on("error",()=>reject(new Error("Provider unavailable")));
});
// Unverified oil/index aliases intentionally unavailable.
export const TWELVE_SYMBOLS: Record<string, string> = {
  XAUUSD: "XAU/USD", BTCUSD: "BTC/USD", EURUSD: "EUR/USD", AAPL: "AAPL",
  ETHUSD: "ETH/USD", SOLUSD: "SOL/USD", XRPUSD: "XRP/USD", GBPUSD: "GBP/USD",
  USDJPY: "USD/JPY", AUDUSD: "AUD/USD", XAGUSD: "XAG/USD",
  MSFT: "MSFT", NVDA: "NVDA", TSLA: "TSLA", SPY: "SPY", QQQ: "QQQ",
};
type Raw = Record<string, unknown>;
const failure = (error: MarketDataError): DataResult<never> => ({ ok: false, error });
function errorCode(raw: Raw): MarketDataError {
  return raw.code === 429 ? "rate_limited" : raw.code === 400 || raw.code === 404 ? "unknown_instrument" : "provider_unavailable";
}
export function normalizeTwelveQuote(symbol: string, raw: Raw): DataResult<Quote> {
  if (raw.status === "error" || raw.code) return failure(errorCode(raw));
  if (raw.symbol !== TWELVE_SYMBOLS[symbol]) return failure("unknown_instrument");
  try {
    const timestamp = raw.last_quote_at ?? raw.timestamp;
    if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) return failure("stale_quote");
    return { ok: true, data: normalizeQuote({ symbol, price: raw.close, bid: raw.bid ?? null, ask: raw.ask ?? null,
      change: raw.change ?? null, changePercent: raw.percent_change ?? null,
      timestamp: new Date(timestamp * 1000).toISOString(), marketOpen: raw.is_market_open === true,
      source: "twelve_data", marketStatusKnown: typeof raw.is_market_open === "boolean" }) };
  } catch { return failure("provider_unavailable"); }
}
export class TwelveDataMarketDataProvider implements MarketDataProvider {
  readonly name = "Twelve Data";
  lastSuccessfulQuoteTime: string | null = null;
  lastError: MarketDataError | null = null;
  private credits: number[] = [];
  private blockedUntil = 0;
  constructor(private key: string, private request: typeof fetch = privateRequest, private now: () => number = Date.now,
    private creditsPerMinute = 8) {}
  private async get(endpoint: string, parameters: Record<string, string>, cost: number): Promise<Raw> {
    if (!this.key) return { code: 401 };
    this.credits = this.credits.filter(t => t > this.now() - 60_000);
    if (this.blockedUntil > this.now() || this.credits.length + cost > this.creditsPerMinute) return { code: 429 };
    this.credits.push(...Array<number>(cost).fill(this.now()));
    const url = new URL(`https://api.twelvedata.com/${endpoint}`);
    for (const [name, value] of Object.entries(parameters)) url.searchParams.set(name, value);
    url.searchParams.set("apikey", this.key);
    try {
      const response = await this.request(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
      const raw = await response.json() as Raw;
      if (response.status === 429 || raw.code === 429) this.blockedUntil = this.now() + 60_000;
      return response.ok ? raw : { code: response.status };
    } catch { return { code: 503 }; }
  }
  async getQuote(symbol: string) { return (await this.getQuotes([symbol]))[symbol]!; }
  async getQuotes(symbols: string[]): Promise<Record<string, DataResult<Quote>>> {
    const output: Record<string, DataResult<Quote>> = {};
    const supported = [...new Set(symbols)].filter(s => TWELVE_SYMBOLS[s]);
    this.credits = this.credits.filter(t => t > this.now() - 60_000);
    const selected = supported.slice(0, Math.max(0, this.creditsPerMinute - this.credits.length));
    // Daily change with the current last_quote_at, not the daily candle start.
    const raw = selected.length ? await this.get("quote", { symbol: selected.map(s => TWELVE_SYMBOLS[s]).join(","), interval: "1day" }, selected.length) : { code: 429 };
    for (const symbol of symbols) {
      const item = !TWELVE_SYMBOLS[symbol] ? failure("unknown_instrument") : !selected.includes(symbol) ? failure("rate_limited") : normalizeTwelveQuote(symbol, ((selected.length === 1 || raw.code ? raw : raw[TWELVE_SYMBOLS[symbol]]) ?? {}) as Raw);
      output[symbol] = item;
      if (item.ok) { if(!this.lastSuccessfulQuoteTime || item.data.timestamp>this.lastSuccessfulQuoteTime)this.lastSuccessfulQuoteTime = item.data.timestamp; this.lastError = null; }
      else this.lastError = item.error;
    }
    return output;
  }
  async getHistoricalData(symbol: string, timeframe: Timeframe): Promise<DataResult<HistoricalPoint[]>> {
    if (!TWELVE_SYMBOLS[symbol]) return failure("unknown_instrument");
    const interval = timeframe === "1D" ? "5min" : timeframe === "1W" ? "1h" : "1day";
    const outputsize = { "1D": "288", "1W": "168", "1M": "31", "3M": "93", "1Y": "366" }[timeframe];
    const raw = await this.get("time_series", { symbol: TWELVE_SYMBOLS[symbol], interval, outputsize, timezone: "UTC" }, 1);
    if (raw.code || raw.status === "error") return failure(errorCode(raw));
    if (!Array.isArray(raw.values)) return failure("provider_unavailable");
    try { return { ok: true, data: raw.values.map((p: Raw) => ({ timestamp: new Date(String(p.datetime).replace(" ", "T") + "Z").toISOString(), price: String(p.close) })).reverse() }; }
    catch { return failure("provider_unavailable"); }
  }
  async getMarketStatus(symbol: string): Promise<DataResult<{ marketOpen: boolean; timestamp: string }>> {
    const q = await this.getQuote(symbol);
    return q.ok ? { ok: true, data: { marketOpen: q.data.marketOpen, timestamp: q.data.timestamp } } : q;
  }
}
