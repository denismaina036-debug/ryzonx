import { REFERENCE_SET_KEYS } from "@/domain/reference-data/set-keys";
import type { ReferenceDataItemInput } from "@/domain/reference-data/types";
import { COUNTRIES_CATALOG } from "@/domain/reference-data/catalog/countries";
import {
  CURRENCIES_CATALOG,
  EXCHANGES_CATALOG,
  FINANCIAL_INSTRUMENTS_CATALOG,
  FINANCIAL_MARKETS_CATALOG,
  MARKET_ANALYSIS_CATALOG,
  RISK_PROFILES_CATALOG,
  TIME_ZONES_CATALOG,
  TRADING_STYLES_CATALOG,
} from "@/domain/reference-data/catalog/financial";

export interface ReferenceCatalogSet {
  key: (typeof REFERENCE_SET_KEYS)[keyof typeof REFERENCE_SET_KEYS];
  name: string;
  description: string;
  items: ReferenceDataItemInput[];
}

export const REFERENCE_DATA_CATALOG: ReferenceCatalogSet[] = [
  {
    key: REFERENCE_SET_KEYS.FINANCIAL_MARKETS,
    name: "Financial Markets",
    description: "Asset classes and market categories",
    items: FINANCIAL_MARKETS_CATALOG,
  },
  {
    key: REFERENCE_SET_KEYS.FINANCIAL_INSTRUMENTS,
    name: "Financial Instruments",
    description: "Tradeable instruments grouped by market",
    items: FINANCIAL_INSTRUMENTS_CATALOG,
  },
  {
    key: REFERENCE_SET_KEYS.COUNTRIES,
    name: "Countries",
    description: "ISO 3166-1 country reference",
    items: COUNTRIES_CATALOG,
  },
  {
    key: REFERENCE_SET_KEYS.TRADING_STYLES,
    name: "Trading Styles",
    description: "Primary trading approach classifications",
    items: TRADING_STYLES_CATALOG,
  },
  {
    key: REFERENCE_SET_KEYS.MARKET_ANALYSIS_METHODS,
    name: "Market Analysis Methods",
    description: "Analysis methodology options",
    items: MARKET_ANALYSIS_CATALOG,
  },
  {
    key: REFERENCE_SET_KEYS.RISK_PROFILES,
    name: "Risk Profiles",
    description: "Risk per trade and drawdown classifications",
    items: RISK_PROFILES_CATALOG,
  },
  {
    key: REFERENCE_SET_KEYS.TIME_ZONES,
    name: "Time Zones",
    description: "Platform time zone reference",
    items: TIME_ZONES_CATALOG,
  },
  {
    key: REFERENCE_SET_KEYS.CURRENCIES,
    name: "Currencies",
    description: "Fiat and digital currency codes",
    items: CURRENCIES_CATALOG,
  },
  {
    key: REFERENCE_SET_KEYS.EXCHANGES,
    name: "Exchanges",
    description: "Major global exchanges",
    items: EXCHANGES_CATALOG,
  },
];

export function getCatalogSet(key: string): ReferenceCatalogSet | undefined {
  return REFERENCE_DATA_CATALOG.find((s) => s.key === key);
}
