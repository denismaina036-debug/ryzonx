import { createHash } from "node:crypto";
import { instrumentSchema, type AssetClass, type Instrument } from "@/domain/trading/models";
import { usableFreeQuote } from "@/domain/trading/market-availability";
import type { MarketDataService } from "./market-data-service";

const categories: Record<string, AssetClass> = { Forex: "forex", Crypto: "crypto", Commodity: "commodities", Index: "indices", Stock: "stocks", ETF: "etfs" };
const canonical: Record<string, string> = { US500: "SPX500", USTEC: "NAS100", US30: "DJ30", US500_X100: "US500X100", USTEC_X100: "USTECX100", US30_X10: "US30X10" };

/** Broker currency is often account currency; FX and metal crosses encode their
 * actual quote currency in the pair. Never label a JPY cross as USD. */
export function normalizeBiQuoteCatalogue(input: unknown, now = Date.now()): Instrument[] {
  if (!Array.isArray(input)) throw new Error("Invalid BiQuote catalogue");
  const instruments = new Map<string, Instrument>();
  for (const row of input) {
    if (!row || typeof row !== "object") continue;
    const assetClass = categories[row.type];
    if (!assetClass || typeof row.name !== "string") continue;
    const symbol = canonical[row.name] ?? row.name;
    if (!/^[A-Z0-9.]{1,24}$/.test(symbol)) continue;
    const pair = ["forex", "crypto", "commodities"].includes(assetClass) && /^[A-Z]{6}$/.test(row.name);
    const quoteCurrency = pair ? row.name.slice(-3) : row.currency;
    if (typeof quoteCurrency !== "string" || !/^[A-Z]{3}$/.test(quoteCurrency)) continue;
    const hash = createHash("sha256").update(`ryvonx:biquote:${symbol}`).digest("hex");
    const parsed = instrumentSchema.safeParse({
      id: `${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`,
      symbol, provider_symbol: row.name, name: typeof row.description === "string" && /_X\d+$/.test(row.name) ? `${row.description} (${row.name})` : row.description, asset_class: assetClass,
      base_currency: pair ? row.name.slice(0,3) : null, quote_currency: quoteCurrency,
      currency: row.currency, exchange: row.exchange ?? null, price_precision: row.digits,
      quantity_precision: 8, minimum_trade_amount: "10", maximum_trade_amount: null,
      enabled: true, buy_enabled: true, sell_enabled: true, trading_enabled: false,
      featured: false, market_status: "unknown", display_order: 1000,
      metadata: { catalogue_source: "biquote" }, created_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString(),
    });
    if (parsed.success) instruments.set(symbol, parsed.data);
  }
  return [...instruments.values()].sort((a,b) => a.symbol.localeCompare(b.symbol));
}

export async function validateFreeCatalogue(instruments: Instrument[], service: MarketDataService, now: () => number = Date.now) {
  const valid: Instrument[] = [];
  for (let offset = 0; offset < instruments.length; offset += 100) {
    const batch = instruments.slice(offset, offset + 100);
    const quotes = await service.getQuotes(batch.map(i => i.symbol));
    valid.push(...batch.filter(i => usableFreeQuote(quotes[i.symbol], now())));
  }
  return valid;
}

export function newCatalogueInstruments(existing: Instrument[], discovered: Instrument[]) {
  const symbols = new Set(existing.map(i => canonical[i.symbol] ?? i.symbol));
  return discovered.filter(i => !symbols.has(i.symbol));
}
