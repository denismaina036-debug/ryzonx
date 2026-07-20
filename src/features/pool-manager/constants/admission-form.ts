export const TRADING_EXPERIENCE_OPTIONS = [
  "Less than 1 year",
  "1–3 years",
  "3–5 years",
  "5–10 years",
  "More than 10 years",
] as const;

export const MARKETS_TRADED_OPTIONS = [
  "Forex",
  "Indices",
  "Commodities",
  "Stocks",
  "ETFs",
  "Futures",
  "Cryptocurrency",
  "Options",
] as const;

export const PRIMARY_INSTRUMENT_OPTIONS = [
  "EUR/USD",
  "GBP/USD",
  "XAU/USD",
  "NAS100",
  "US30",
  "BTC/USD",
  "ETH/USD",
  "Other",
] as const;

export const TRADING_STYLE_OPTIONS = [
  "Scalping",
  "Day Trading",
  "Swing Trading",
  "Position Trading",
  "Algorithmic Trading",
] as const;

export const TRADE_DURATION_OPTIONS = [
  "Less than 1 Hour",
  "Several Hours",
  "1–3 Days",
  "1–2 Weeks",
  "More than 2 Weeks",
] as const;

export const MARKET_ANALYSIS_OPTIONS = [
  "Technical Analysis",
  "Fundamental Analysis",
  "Price Action",
  "Smart Money Concepts",
  "ICT Concepts",
  "Volume Analysis",
  "Quantitative Models",
  "Algorithmic Models",
  "Other",
] as const;

export const RISK_PER_TRADE_OPTIONS = [
  "Below 0.5%",
  "0.5%",
  "1%",
  "1.5%",
  "2%",
  "Above 2%",
] as const;

export const MAX_DRAWDOWN_OPTIONS = [
  "Below 5%",
  "5–10%",
  "10–15%",
  "15–20%",
  "Above 20%",
] as const;

export const ADMISSION_WIZARD_STEPS = [
  { section: 1, title: "Professional Background", description: "Your market experience" },
  { section: 2, title: "Trading Methodology", description: "How you approach markets" },
  { section: 3, title: "Risk Management", description: "Capital protection" },
  { section: 4, title: "Trading Performance", description: "Track record" },
  { section: 5, title: "Personal Statement", description: "Your motivation" },
  { section: 6, title: "Admission Path", description: "Choose your path" },
  { section: 7, title: "Review", description: "Confirm & submit" },
] as const;
