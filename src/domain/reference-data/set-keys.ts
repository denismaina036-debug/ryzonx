export const REFERENCE_SET_KEYS = {
  FINANCIAL_MARKETS: "financial_markets",
  FINANCIAL_INSTRUMENTS: "financial_instruments",
  COUNTRIES: "countries",
  TRADING_STYLES: "trading_styles",
  MARKET_ANALYSIS_METHODS: "market_analysis_methods",
  RISK_PROFILES: "risk_profiles",
  TIME_ZONES: "time_zones",
  CURRENCIES: "currencies",
  EXCHANGES: "exchanges",
} as const;

export type ReferenceSetKey = (typeof REFERENCE_SET_KEYS)[keyof typeof REFERENCE_SET_KEYS];

export const REFERENCE_SET_LABELS: Record<ReferenceSetKey, string> = {
  financial_markets: "Financial Markets",
  financial_instruments: "Financial Instruments",
  countries: "Countries",
  trading_styles: "Trading Styles",
  market_analysis_methods: "Market Analysis Methods",
  risk_profiles: "Risk Profiles",
  time_zones: "Time Zones",
  currencies: "Currencies",
  exchanges: "Exchanges",
};
