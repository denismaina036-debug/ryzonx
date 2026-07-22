import { getCatalogSet } from "@/domain/reference-data/catalog";
import { REFERENCE_SET_KEYS, type ReferenceSetKey } from "@/domain/reference-data/set-keys";
import type { ReferenceDataOption } from "@/domain/reference-data/types";
import { normalizeMarketCodes } from "@/domain/reference-data/utils";

function buildSearchText(input: {
  code: string;
  label: string;
  searchTerms?: string;
  parentCode?: string | null;
}): string {
  return [input.label, input.code, input.searchTerms, input.parentCode]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

const catalogCache = new Map<ReferenceSetKey, ReferenceDataOption[]>();
let instrumentsByMarket: Map<string, ReferenceDataOption[]> | null = null;

export function getCatalogOptions(setKey: ReferenceSetKey): ReferenceDataOption[] {
  const cached = catalogCache.get(setKey);
  if (cached) return cached;

  const set = getCatalogSet(setKey);
  if (!set) return [];

  const options = set.items.map((item) => ({
    code: item.code,
    label: item.label,
    parentCode: item.parentCode ?? null,
    searchText: buildSearchText({
      code: item.code,
      label: item.label,
      searchTerms: item.searchTerms,
      parentCode: item.parentCode,
    }),
    metadata: item.metadata,
  }));

  catalogCache.set(setKey, options);
  return options;
}

function getInstrumentsByMarket(): Map<string, ReferenceDataOption[]> {
  if (instrumentsByMarket) return instrumentsByMarket;

  instrumentsByMarket = new Map();
  for (const item of getCatalogOptions(REFERENCE_SET_KEYS.FINANCIAL_INSTRUMENTS)) {
    if (!item.parentCode) continue;
    const bucket = instrumentsByMarket.get(item.parentCode) ?? [];
    if (bucket.some((existing) => existing.code === item.code)) continue;
    bucket.push(item);
    instrumentsByMarket.set(item.parentCode, bucket);
  }

  return instrumentsByMarket;
}

export function getCatalogInstrumentsForMarkets(marketCodes: string[]): ReferenceDataOption[] {
  const markets = normalizeMarketCodes(marketCodes);
  if (markets.length === 0) return [];

  const byMarket = getInstrumentsByMarket();
  const seen = new Set<string>();
  const result: ReferenceDataOption[] = [];
  for (const market of markets) {
    const bucket = byMarket.get(market);
    if (!bucket) continue;
    for (const option of bucket) {
      if (seen.has(option.code)) continue;
      seen.add(option.code);
      result.push(option);
    }
  }

  return result;
}
