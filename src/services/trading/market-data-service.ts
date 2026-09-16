import { canonicalSymbol } from "@/domain/trading/models";
import { normalizeQuote, quoteFreshness, type DataResult, type HistoricalPoint, type MarketDataError, type MarketDataProvider, type Quote, type Timeframe } from "@/domain/trading/market-data";

/** Explicit disconnected adapter until a licensed provider is configured. */
export class UnavailableMarketDataProvider implements MarketDataProvider {
  readonly name = "Not connected";
  constructor(private readonly reason: MarketDataError = "missing_configuration") {}
  async getQuote(_symbol: string): Promise<DataResult<Quote>> { return { ok: false, error: this.reason }; }
  async getQuotes(symbols: string[]): Promise<Record<string, DataResult<Quote>>> {
    return Object.fromEntries(symbols.map(symbol => [symbol, { ok: false, error: this.reason }]));
  }
  async getHistoricalData(_symbol: string, _timeframe: Timeframe): Promise<DataResult<HistoricalPoint[]>> { return { ok: false, error: this.reason }; }
  async getMarketStatus(_symbol: string): Promise<DataResult<{ marketOpen: boolean; timestamp: string }>> { return { ok: false, error: this.reason }; }
}

/** Shared process cache; batch limit and cooldown protect upstream APIs. A deployed
 * multi-instance provider will also need a shared quota store (see implementation doc).
 */
export class MarketDataService {
  private cache = new Map<string, { expires: number; result: DataResult<Quote> }>();
  private pending = new Map<string, Promise<DataResult<Quote>>>();
  private history = new Map<string, { expires: number; result: DataResult<HistoricalPoint[]> }>();
  private historyPending = new Map<string, Promise<DataResult<HistoricalPoint[]>>>();
  private cooldown = 0;
  constructor(private provider: MarketDataProvider, private now: () => number = Date.now) {}
  get providerName() { return this.provider.name; }
  async getQuote(symbol: string) { return (await this.getQuotes([symbol]))[canonicalSymbol(symbol)] ?? { ok: false as const, error: "unknown_instrument" as const }; }
  async getQuotes(input: string[]): Promise<Record<string, DataResult<Quote>>> {
    const symbols = [...new Set(input.map(canonicalSymbol))].sort().slice(0, 100);
    const result: Record<string, DataResult<Quote>> = {};
    const missing: string[] = [];
    for (const symbol of symbols) {
      const entry = this.cache.get(symbol);
      if (entry && entry.expires > this.now()) result[symbol] = entry.result.ok ? quoteFreshness(entry.result.data, this.now()) : entry.result;
      else missing.push(symbol);
    }
    if (!missing.length) return result;
    if (this.cooldown > this.now()) return { ...result, ...Object.fromEntries(missing.map(s => [s, { ok: false, error: "rate_limited" }])) };
    const unrequested=missing.filter(symbol=>!this.pending.has(symbol));
    if(unrequested.length) {
      const batch=this.fetchQuotes(unrequested);
      for(const symbol of unrequested) this.pending.set(symbol,batch.then(data=>data[symbol]!).finally(()=>this.pending.delete(symbol)));
    }
    const resolved=await Promise.all(missing.map(async symbol=>[symbol,await this.pending.get(symbol)!] as const));
    return {...result,...Object.fromEntries(resolved)};
  }
  private async fetchQuotes(symbols: string[]) {
    let data: Record<string, DataResult<Quote>>;
    try { data = await this.provider.getQuotes(symbols); }
    catch { data = Object.fromEntries(symbols.map(s => [s, { ok: false, error: "network_error" }])); }
    const output: Record<string, DataResult<Quote>> = {};
    for (const symbol of symbols) {
      let result = data[symbol] ?? { ok: false as const, error: "unknown_instrument" as const };
      if (result.ok) {
        try {
          const quote = normalizeQuote(result.data);
          result = quote.symbol === symbol ? quoteFreshness(quote, this.now()) : { ok: false, error: "unknown_instrument" };
        } catch { result = { ok: false, error: "provider_unavailable" }; }
      }
      if (!result.ok && result.error === "rate_limited") this.cooldown = this.now() + 60_000;
      output[symbol] = result;
      this.cache.set(symbol, { result, expires: this.now() + (result.ok ? 15_000 : 30_000) });
    }
    if (this.cache.size > 1000) this.cache.clear();
    return output;
  }
  async getHistoricalData(symbol: string, timeframe: Timeframe): Promise<DataResult<HistoricalPoint[]>> {
    const key = `${canonicalSymbol(symbol)}:${timeframe}`;
    const cached = this.history.get(key);
    if (cached && cached.expires > this.now()) return cached.result;
    const pending = this.historyPending.get(key);
    if (pending) return pending;
    const request = this.fetchHistory(symbol, timeframe).finally(() => this.historyPending.delete(key));
    this.historyPending.set(key, request);
    return request;
  }
  private async fetchHistory(symbol: string, timeframe: Timeframe): Promise<DataResult<HistoricalPoint[]>> {
    let result: DataResult<HistoricalPoint[]>;
    if (this.cooldown > this.now()) return { ok: false, error: "rate_limited" };
    try {
      result = await this.provider.getHistoricalData(canonicalSymbol(symbol), timeframe);
      if (result.ok) {
        let previous = 0;
        for (const point of result.data) {
          const time = Date.parse(point.timestamp);
          if (!Number.isFinite(time) || time <= previous || time > this.now() + 5_000 || !/^\d+(\.\d{1,12})?$/.test(point.price) || Number(point.price) <= 0) throw new Error("Invalid historical data");
          previous = time;
        }
      }
    } catch { result = { ok: false, error: "provider_unavailable" }; }
    if (!result.ok && result.error === "rate_limited") this.cooldown = this.now() + 60_000;
    this.history.set(`${canonicalSymbol(symbol)}:${timeframe}`, { result, expires: this.now() + 60_000 });
    if (this.history.size > 500) this.history.clear();
    return result;
  }
  async getMarketStatus(symbol: string): Promise<DataResult<{ marketOpen: boolean; timestamp: string }>> {
    const quote = await this.getQuote(symbol);
    return quote.ok ? { ok: true, data: { marketOpen: quote.data.marketOpen, timestamp: quote.data.timestamp } } : quote;
  }
}
