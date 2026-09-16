import { z } from "zod";
import { canonicalSymbol, decimalSchema } from "./models";
import { decimal } from "./calculations";

export const TIMEFRAMES = ["1D", "1W", "1M", "3M", "1Y"] as const;
export type Timeframe = typeof TIMEFRAMES[number];
export type MarketDataError = "missing_configuration" | "provider_unavailable" | "rate_limited" | "stale_quote" | "unknown_instrument" | "market_closed" | "network_error";
export type DataResult<T> = { ok: true; data: T } | { ok: false; error: MarketDataError };
const signedDecimal = z.string().regex(/^-?\d{1,18}(\.\d{1,12})?$/);
export const quoteSchema = z.object({
  symbol: z.string().min(1).transform(canonicalSymbol), bid: decimalSchema.nullable(), ask: decimalSchema.nullable(),
  price: decimalSchema.refine(v => decimal(v) > BigInt(0)), change: signedDecimal.nullable(), changePercent: signedDecimal.nullable(),
  timestamp: z.string().datetime({ offset: true }), marketOpen: z.boolean(),
  source: z.enum(["twelve_data", "biquote"]).optional(), marketStatusKnown: z.boolean().optional(),
  providerSymbol: z.string().optional(), stale: z.boolean().optional(), marketState: z.enum(["open", "closed", "unknown"]).optional(),
}).refine(q => (q.bid === null || decimal(q.bid) > BigInt(0)) && (q.ask === null || decimal(q.ask) > BigInt(0)) && (q.bid === null || q.ask === null || decimal(q.bid) <= decimal(q.ask)), "Invalid spread");
export type Quote = z.infer<typeof quoteSchema>;
export type HistoricalPoint = { timestamp: string; price: string };
export function normalizeQuote(input: unknown): Quote { return quoteSchema.parse(input); }
export function quoteFreshness(quote: Quote, now = Date.now(), maxAgeMs = 60_000): DataResult<Quote> {
  const timestamp = Date.parse(quote.timestamp);
  if (quote.stale === true || !Number.isFinite(timestamp) || timestamp > now + 5_000 || now - timestamp > maxAgeMs) return { ok: false, error: "stale_quote" };
  return { ok: true, data: quote };
}
export function executableQuote(quote: Quote, now = Date.now()): DataResult<Quote> {
  const freshness = quoteFreshness(quote, now);
  return !freshness.ok ? freshness : quote.marketOpen ? freshness : { ok: false, error: "market_closed" };
}
/** Adapters receive canonical symbols; provider aliases belong exclusively in adapters/catalogue. */
export interface MarketDataProvider {
  readonly name: string;
  getQuote(symbol: string): Promise<DataResult<Quote>>;
  getQuotes(symbols: string[]): Promise<Record<string, DataResult<Quote>>>;
  getHistoricalData(symbol: string, timeframe: Timeframe): Promise<DataResult<HistoricalPoint[]>>;
  getMarketStatus(symbol: string): Promise<DataResult<{ marketOpen: boolean; timestamp: string }>>;
}
export const MARKET_DATA_MESSAGES: Record<MarketDataError, string> = {
  missing_configuration: "Market data is not connected yet.", provider_unavailable: "Market data is temporarily unavailable.",
  rate_limited: "Market data is busy. Please try again shortly.", stale_quote: "Waiting for a fresh quote.",
  unknown_instrument: "This market is unavailable.", market_closed: "Market closed.", network_error: "Quotes could not be refreshed. Please try again shortly.",
};
