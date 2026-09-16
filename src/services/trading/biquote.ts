import { canonicalSymbol } from "@/domain/trading/models";
import { normalizeBiQuoteCatalogue } from "./biquote-catalogue";
import { decimal, decimalString } from "@/domain/trading/calculations";
import { normalizeQuote, quoteFreshness, type DataResult, type HistoricalPoint, type MarketDataError, type MarketDataProvider, type Quote, type Timeframe } from "@/domain/trading/market-data";

// Verified against /api/symbols?type=Index and live /api/latest responses.
// Keep RyvonX identifiers stable; never substitute leveraged *_X100 products.
export const BIQUOTE_SYMBOLS: Readonly<Record<string, string>> = {
  XAUUSD: "XAUUSD", BTCUSD: "BTCUSD", EURUSD: "EURUSD",
  SPX500: "US500", US500: "US500", NAS100: "USTEC", USTEC: "USTEC", DJ30: "US30",
  US500X100: "US500_X100", USTECX100: "USTEC_X100", US30X10: "US30_X10",
};
const failure = (error: MarketDataError): DataResult<never> => ({ ok: false, error });
type Raw = Record<string, unknown>;
function record(value: unknown): value is Raw { return typeof value === "object" && value !== null && !Array.isArray(value); }
function numberText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value) && Math.abs(value) < 1e18) {
    return value.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 12 });
  }
  if (typeof value === "string" && /^-?\d{1,18}(\.\d{1,12})?$/.test(value)) return value;
  throw new Error("Invalid quote number");
}
export function normalizeBiQuote(symbol: string, input: unknown): DataResult<Quote> {
  const canonical = canonicalSymbol(symbol);
  if (!record(input) || input.symbol !== (BIQUOTE_SYMBOLS[canonical] ?? canonical)) return failure("unknown_instrument");
  try {
    const bid = numberText(input.bid), ask = numberText(input.ask);
    // FX/CFD `last` is 0: prefer the supplied mid, otherwise derive the midpoint.
    const price = numberText(input.mid ?? input.price) ?? (bid !== null && ask !== null ? decimalString((decimal(bid) + decimal(ask)) / BigInt(2)) : null);
    const marketState = input.marketState === "open" ? "open" : input.marketState === "closed" ? "closed" : "unknown";
    if (input.stale != null && typeof input.stale !== "boolean") return failure("provider_unavailable");
    if (input.quoteAgeSeconds != null && (typeof input.quoteAgeSeconds !== "number" || !Number.isFinite(input.quoteAgeSeconds) || input.quoteAgeSeconds < 0)) return failure("provider_unavailable");
    return { ok: true, data: normalizeQuote({
      symbol: canonical, providerSymbol: input.symbol, source: "biquote", bid, ask, price,
      change: marketState === "closed" ? null : numberText(input.changeAmount),
      changePercent: marketState === "closed" ? null : numberText(input.dayDiffPercent),
      timestamp: input.lastQuoteAt ?? input.timestamp,
      marketOpen: marketState === "open", marketStatusKnown: marketState !== "unknown", marketState,
      stale: input.stale === true || (typeof input.quoteAgeSeconds === "number" && input.quoteAgeSeconds > 60),
    }) };
  } catch { return failure("provider_unavailable"); }
}

/** Public, keyless API. All calls stay behind the server-side provider selector. */
export class BiQuoteMarketDataProvider implements MarketDataProvider {
  readonly name = "BiQuote";
  lastSuccessfulQuoteTime: string | null = null;
  lastError: MarketDataError | null = null;
  private blockedUntil = 0;
  constructor(private request: typeof fetch = fetch, private now: () => number = Date.now) {}
  async getInstruments() {
    const result = await this.get("symbols", new URLSearchParams({ quotedWithinDays: "7" }));
    if (!result.ok) throw new Error("BiQuote catalogue unavailable");
    return normalizeBiQuoteCatalogue(result.data, this.now());
  }
  private async get(path: string, params: URLSearchParams): Promise<DataResult<unknown>> {
    if (this.blockedUntil > this.now()) return failure("rate_limited");
    try {
      const response = await this.request(`https://biquote.io/api/${path}?${params}`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
      if (response.status === 429) {
        const retry = response.headers.get("retry-after");
        const seconds = retry && /^\d+$/.test(retry) ? Number(retry) : 60;
        const retryAt = retry && !/^\d+$/.test(retry) ? Date.parse(retry) : NaN;
        this.blockedUntil = Math.max(this.now() + 60_000, Number.isFinite(retryAt) ? retryAt : this.now() + seconds * 1000);
        return failure("rate_limited");
      }
      if (!response.ok) return failure(response.status === 404 ? "unknown_instrument" : "provider_unavailable");
      return { ok: true, data: await response.json() as unknown };
    } catch { return failure("network_error"); }
  }
  async getQuote(symbol: string): Promise<DataResult<Quote>> {
    const canonical = canonicalSymbol(symbol);
    return (await this.getQuotes([canonical]))[canonical] ?? failure("unknown_instrument");
  }
  async getQuotes(input: string[]): Promise<Record<string, DataResult<Quote>>> {
    const symbols = [...new Set(input.map(canonicalSymbol))];
    const aliases = [...new Set(symbols.map(s => BIQUOTE_SYMBOLS[s] ?? s).filter((s): s is string => Boolean(s)))];
    const params = new URLSearchParams();
    for (const alias of aliases) params.append("symbols", alias);
    // Repeated symbols parameters, not comma-separated. One request per batch.
    const response = aliases.length ? await this.get("latest", params) : null;
    const result: Record<string, DataResult<Quote>> = {};
    for (const symbol of symbols) {
      const alias = BIQUOTE_SYMBOLS[symbol] ?? symbol;
      const quote = !alias ? failure("unknown_instrument") : !response?.ok ? response ?? failure("unknown_instrument")
        : normalizeBiQuote(symbol, record(response.data) ? response.data[alias] : null);
      const validated = quote.ok ? quoteFreshness(quote.data, this.now()) : quote;
      result[symbol] = validated;
      if (validated.ok) {
        if (!this.lastSuccessfulQuoteTime || validated.data.timestamp > this.lastSuccessfulQuoteTime) this.lastSuccessfulQuoteTime = validated.data.timestamp;
        this.lastError = null;
      } else this.lastError = validated.error;
    }
    return result;
  }
  async getMarketStatus(symbol: string): Promise<DataResult<{ marketOpen: boolean; timestamp: string }>> {
    const quote = await this.getQuote(symbol);
    return quote.ok ? { ok: true, data: { marketOpen: quote.data.marketOpen, timestamp: quote.data.timestamp } } : quote;
  }
  async getHistoricalData(symbol: string, timeframe: Timeframe): Promise<DataResult<HistoricalPoint[]>> {
    const alias = BIQUOTE_SYMBOLS[canonicalSymbol(symbol)] ?? canonicalSymbol(symbol);
    if (!alias) return failure("unknown_instrument");
    const interval = timeframe === "1D" ? "5m" : timeframe === "1W" ? "1h" : "1d";
    const limit = { "1D": "288", "1W": "168", "1M": "31", "3M": "93", "1Y": "366" }[timeframe];
    const response = await this.get(`${encodeURIComponent(alias)}/ohlc`, new URLSearchParams({ interval, limit }));
    if (!response.ok) return response;
    if (!record(response.data) || response.data.symbol !== alias || !Array.isArray(response.data.bars)) return failure("provider_unavailable");
    try {
      const points = response.data.bars.map((bar: unknown) => {
        if (!record(bar) || typeof bar.openTime !== "string") throw new Error("Invalid bar");
        const price = numberText(bar.close), timestamp = new Date(bar.openTime).toISOString();
        if (!price || decimal(price) <= BigInt(0)) throw new Error("Invalid bar price");
        return { timestamp, price };
      }).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      return { ok: true, data: points };
    } catch { return failure("provider_unavailable"); }
  }
}
