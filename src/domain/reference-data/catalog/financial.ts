import type { ReferenceDataItemInput } from "@/domain/reference-data/types";

export function item(
  code: string,
  label: string,
  opts?: {
    parentCode?: string;
    searchTerms?: string;
    sortOrder?: number;
    metadata?: Record<string, unknown>;
  }
): ReferenceDataItemInput {
  return {
    code,
    label,
    parentCode: opts?.parentCode ?? null,
    searchTerms: opts?.searchTerms,
    sortOrder: opts?.sortOrder ?? 0,
    metadata: opts?.metadata,
  };
}

export const FINANCIAL_MARKETS_CATALOG: ReferenceDataItemInput[] = [
  item("forex", "Forex", { sortOrder: 1 }),
  item("cryptocurrency", "Cryptocurrency", { sortOrder: 2 }),
  item("indices", "Indices", { sortOrder: 3 }),
  item("commodities", "Commodities", { sortOrder: 4 }),
  item("stocks", "Stocks", { sortOrder: 5 }),
  item("etfs", "ETFs", { sortOrder: 6 }),
  item("futures", "Futures", { sortOrder: 7 }),
  item("options", "Options", { sortOrder: 8 }),
];

const FOREX_PAIRS = [
  "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "USD/CAD", "AUD/USD", "NZD/USD",
  "EUR/GBP", "EUR/JPY", "GBP/JPY", "EUR/CHF", "AUD/JPY", "EUR/AUD", "GBP/AUD",
  "CHF/JPY", "CAD/JPY", "NZD/JPY", "EUR/CAD", "GBP/CAD", "AUD/CAD", "EUR/NZD",
  "GBP/NZD", "AUD/NZD", "EUR/SEK", "EUR/NOK", "USD/SEK", "USD/NOK", "USD/MXN",
  "USD/ZAR", "USD/TRY", "USD/SGD", "USD/HKD", "USD/PLN", "USD/DKK", "EUR/PLN",
  "GBP/CHF", "AUD/CHF", "NZD/CAD", "EUR/HUF", "USD/CNH", "USD/INR", "USD/BRL",
  "CAD/CHF",
];

const CRYPTO_PAIRS = [
  "BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT", "ADA/USDT",
  "DOGE/USDT", "AVAX/USDT", "LINK/USDT", "DOT/USDT", "MATIC/USDT", "LTC/USDT",
  "ATOM/USDT", "UNI/USDT", "FIL/USDT", "APT/USDT", "ARB/USDT", "OP/USDT",
  "NEAR/USDT", "INJ/USDT", "SUI/USDT", "SEI/USDT", "TIA/USDT", "PEPE/USDT",
];

const INDICES = [
  "US30", "NAS100", "SPX500", "GER40", "UK100", "JP225", "HK50", "AUS200", "EU50",
];

const COMMODITIES = [
  "Gold (XAU/USD)", "Silver (XAG/USD)", "WTI Crude Oil", "Brent Crude Oil",
  "Natural Gas", "Copper", "Platinum", "Palladium",
];

const STOCKS = [
  "Apple", "Microsoft", "Amazon", "NVIDIA", "Tesla", "Meta", "Alphabet", "Netflix",
  "AMD", "Intel", "JPMorgan", "Visa", "Mastercard", "Berkshire Hathaway", "Exxon Mobil",
  "Johnson & Johnson", "Procter & Gamble", "Coca-Cola", "Disney", "Salesforce",
];

const ETFS = ["SPY", "QQQ", "VTI", "VOO", "ARKK", "IWM", "DIA", "XLF", "XLE", "GLD"];

const FUTURES = [
  "E-mini S&P 500", "NASDAQ Futures", "Dow Futures", "Gold Futures", "Oil Futures",
  "Natural Gas Futures", "Euro FX Futures", "Treasury Futures",
];

const OPTIONS = [
  "Equity Options", "Index Options", "ETF Options", "Commodity Options", "Currency Options",
];

function instrumentCode(market: string, label: string): string {
  return `${market}:${label.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
}

function marketInstruments(market: string, labels: string[]): ReferenceDataItemInput[] {
  return labels.map((label, index) =>
    item(instrumentCode(market, label), label, {
      parentCode: market,
      sortOrder: index + 1,
      searchTerms: label.replace(/[()]/g, ""),
    })
  );
}

export const FINANCIAL_INSTRUMENTS_CATALOG: ReferenceDataItemInput[] = [
  ...marketInstruments("forex", FOREX_PAIRS),
  ...marketInstruments("cryptocurrency", CRYPTO_PAIRS),
  ...marketInstruments("indices", INDICES),
  ...marketInstruments("commodities", COMMODITIES),
  ...marketInstruments("stocks", STOCKS),
  ...marketInstruments("etfs", ETFS),
  ...marketInstruments("futures", FUTURES),
  ...marketInstruments("options", OPTIONS),
];

export const TRADING_STYLES_CATALOG: ReferenceDataItemInput[] = [
  item("scalping", "Scalping", { sortOrder: 1 }),
  item("day_trading", "Day Trading", { sortOrder: 2 }),
  item("swing_trading", "Swing Trading", { sortOrder: 3 }),
  item("position_trading", "Position Trading", { sortOrder: 4 }),
  item("algorithmic_trading", "Algorithmic Trading", { sortOrder: 5 }),
];

export const MARKET_ANALYSIS_CATALOG: ReferenceDataItemInput[] = [
  item("technical_analysis", "Technical Analysis", { sortOrder: 1 }),
  item("fundamental_analysis", "Fundamental Analysis", { sortOrder: 2 }),
  item("price_action", "Price Action", { sortOrder: 3 }),
  item("smart_money_concepts", "Smart Money Concepts", { sortOrder: 4 }),
  item("ict_concepts", "ICT Concepts", { sortOrder: 5 }),
  item("volume_analysis", "Volume Analysis", { sortOrder: 6 }),
  item("quantitative_models", "Quantitative Models", { sortOrder: 7 }),
  item("algorithmic_models", "Algorithmic Models", { sortOrder: 8 }),
  item("other", "Other", { sortOrder: 99 }),
];

export const RISK_PROFILES_CATALOG: ReferenceDataItemInput[] = [
  item("below_0_5", "Below 0.5%", { sortOrder: 1 }),
  item("0_5_pct", "0.5%", { sortOrder: 2 }),
  item("1_pct", "1%", { sortOrder: 3 }),
  item("1_5_pct", "1.5%", { sortOrder: 4 }),
  item("2_pct", "2%", { sortOrder: 5 }),
  item("above_2", "Above 2%", { sortOrder: 6 }),
  item("below_5_dd", "Below 5%", { sortOrder: 10, metadata: { type: "drawdown" } }),
  item("5_10_dd", "5–10%", { sortOrder: 11, metadata: { type: "drawdown" } }),
  item("10_15_dd", "10–15%", { sortOrder: 12, metadata: { type: "drawdown" } }),
  item("15_20_dd", "15–20%", { sortOrder: 13, metadata: { type: "drawdown" } }),
  item("above_20_dd", "Above 20%", { sortOrder: 14, metadata: { type: "drawdown" } }),
];

export const TIME_ZONES_CATALOG: ReferenceDataItemInput[] = [
  item("utc", "UTC", { sortOrder: 1 }),
  item("america_new_york", "America/New York (EST/EDT)", { sortOrder: 2 }),
  item("america_chicago", "America/Chicago (CST/CDT)", { sortOrder: 3 }),
  item("america_los_angeles", "America/Los Angeles (PST/PDT)", { sortOrder: 4 }),
  item("europe_london", "Europe/London (GMT/BST)", { sortOrder: 5 }),
  item("europe_berlin", "Europe/Berlin (CET/CEST)", { sortOrder: 6 }),
  item("asia_tokyo", "Asia/Tokyo (JST)", { sortOrder: 7 }),
  item("asia_singapore", "Asia/Singapore (SGT)", { sortOrder: 8 }),
  item("asia_dubai", "Asia/Dubai (GST)", { sortOrder: 9 }),
  item("australia_sydney", "Australia/Sydney (AEST/AEDT)", { sortOrder: 10 }),
];

export const CURRENCIES_CATALOG: ReferenceDataItemInput[] = [
  item("USD", "US Dollar", { sortOrder: 1 }),
  item("EUR", "Euro", { sortOrder: 2 }),
  item("GBP", "British Pound", { sortOrder: 3 }),
  item("JPY", "Japanese Yen", { sortOrder: 4 }),
  item("CHF", "Swiss Franc", { sortOrder: 5 }),
  item("CAD", "Canadian Dollar", { sortOrder: 6 }),
  item("AUD", "Australian Dollar", { sortOrder: 7 }),
  item("NZD", "New Zealand Dollar", { sortOrder: 8 }),
  item("BTC", "Bitcoin", { sortOrder: 20 }),
  item("ETH", "Ethereum", { sortOrder: 21 }),
];

export const EXCHANGES_CATALOG: ReferenceDataItemInput[] = [
  item("nyse", "New York Stock Exchange (NYSE)", { sortOrder: 1 }),
  item("nasdaq", "NASDAQ", { sortOrder: 2 }),
  item("lse", "London Stock Exchange (LSE)", { sortOrder: 3 }),
  item("euronext", "Euronext", { sortOrder: 4 }),
  item("tse", "Tokyo Stock Exchange (TSE)", { sortOrder: 5 }),
  item("hkex", "Hong Kong Stock Exchange (HKEX)", { sortOrder: 6 }),
  item("asx", "Australian Securities Exchange (ASX)", { sortOrder: 7 }),
  item("cboe", "CBOE", { sortOrder: 8 }),
  item("cme", "CME Group", { sortOrder: 9 }),
  item("ice", "Intercontinental Exchange (ICE)", { sortOrder: 10 }),
];
