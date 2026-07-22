const LEGACY_MARKET_LABEL_TO_CODE: Record<string, string> = {
  forex: "forex",
  cryptocurrency: "cryptocurrency",
  crypto: "cryptocurrency",
  indices: "indices",
  commodities: "commodities",
  stocks: "stocks",
  etfs: "etfs",
  futures: "futures",
  options: "options",
  Forex: "forex",
  Cryptocurrency: "cryptocurrency",
  Indices: "indices",
  Commodities: "commodities",
  Stocks: "stocks",
  ETFs: "etfs",
  Futures: "futures",
  Options: "options",
};

export function normalizeMarketCode(value: string): string {
  const trimmed = value.trim();
  return LEGACY_MARKET_LABEL_TO_CODE[trimmed] ?? trimmed.toLowerCase();
}

export function normalizeMarketCodes(values: string[] | null | undefined): string[] {
  if (!values?.length) return [];
  return [...new Set(values.map(normalizeMarketCode).filter(Boolean))];
}

export function resolveOptionLabel(
  options: Array<{ code: string; label: string }>,
  code: string | undefined
): string | undefined {
  if (!code) return undefined;
  return options.find((o) => o.code === code)?.label ?? code;
}
