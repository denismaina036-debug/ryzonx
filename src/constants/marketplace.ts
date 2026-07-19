export const MARKETPLACE_CATEGORIES = [
  "conservative",
  "balanced",
  "growth",
  "aggressive",
  "scalping",
  "swing_trading",
  "forex",
  "gold",
  "indices",
  "crypto",
  "multi_asset",
  "long_term",
  "income",
  "high_growth",
] as const;

export type MarketplaceCategory = (typeof MARKETPLACE_CATEGORIES)[number];

export const MARKETPLACE_CATEGORY_LABELS: Record<string, string> = {
  conservative: "Conservative",
  balanced: "Balanced",
  growth: "Growth",
  aggressive: "Aggressive",
  scalping: "Scalping",
  swing_trading: "Swing Trading",
  forex: "Forex",
  gold: "Gold",
  indices: "Indices",
  crypto: "Crypto",
  multi_asset: "Multi Asset",
  long_term: "Long-Term",
  income: "Income",
  high_growth: "High Growth",
};

export const SECURITY_RATING = {
  VERY_SAFE: "very_safe",
  SAFE: "safe",
  BALANCED: "balanced",
  AGGRESSIVE: "aggressive",
  HIGH_RISK: "high_risk",
} as const;

export const SECURITY_RATING_LABELS: Record<string, string> = {
  very_safe: "Very Safe",
  safe: "Safe",
  balanced: "Balanced",
  aggressive: "Aggressive",
  high_risk: "High Risk",
};

export const AGGRESSIVENESS_LEVEL = {
  LOW: "low",
  MODERATE: "moderate",
  HIGH: "high",
  EXTREME: "extreme",
} as const;

export const AGGRESSIVENESS_LABELS: Record<string, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
  extreme: "Extreme",
};

export const POOL_HEALTH = {
  HEALTHY: "healthy",
  WATCHLIST: "watchlist",
  WARNING: "warning",
  RESTRICTED: "restricted",
  SUSPENDED: "suspended",
} as const;

export const POOL_HEALTH_LABELS: Record<string, string> = {
  healthy: "Healthy",
  watchlist: "Watchlist",
  warning: "Warning",
  restricted: "Restricted",
  suspended: "Suspended",
};

export const CAPACITY_STATUS = {
  OPEN: "open",
  NEARLY_FULL: "nearly_full",
  FULL: "full",
  CLOSED: "closed",
  WAITING_LIST: "waiting_list",
} as const;

export const CAPACITY_STATUS_LABELS: Record<string, string> = {
  open: "Open",
  nearly_full: "Nearly Full",
  full: "Full",
  closed: "Closed",
  waiting_list: "Waiting List",
};

export const MARKETPLACE_MANAGER_TABS = [
  { value: "managers", label: "Pool Managers" },
  { value: "opportunities", label: "Live Pools" },
] as const;

export const MARKETPLACE_MANAGER_SORT_OPTIONS = [
  { value: "best_rated", label: "Best Rated" },
  { value: "highest_return", label: "Highest Return" },
  { value: "most_investors", label: "Most Investors" },
  { value: "highest_aum", label: "Highest Capital" },
  { value: "most_pools", label: "Most Opportunities" },
  { value: "newest", label: "Newest" },
] as const;

export const MARKETPLACE_SORT_OPTIONS = [
  { value: "best_rated", label: "Best Rated" },
  { value: "highest_return", label: "Highest Return" },
  { value: "lowest_risk", label: "Lowest Risk" },
  { value: "most_investors", label: "Most Investors" },
  { value: "highest_aum", label: "Highest Capital" },
  { value: "newest", label: "Newest" },
  { value: "trending", label: "Trending" },
] as const;

export type MarketplaceSort = (typeof MARKETPLACE_SORT_OPTIONS)[number]["value"];

export const FEATURED_SECTION_KEYS = [
  "most_popular",
  "highest_rated",
  "fastest_growing",
  "most_consistent",
  "lowest_drawdown",
  "highest_aum",
  "newest_verified",
] as const;

export const FEATURED_SECTION_LABELS: Record<string, string> = {
  most_popular: "Most Popular",
  highest_rated: "Highest Rated",
  fastest_growing: "Fastest Growing",
  most_consistent: "Most Consistent",
  lowest_drawdown: "Lowest Drawdown",
  highest_aum: "Highest Capital",
  newest_verified: "Newest Verified",
};

export const SECURITY_RISK_ORDER: Record<string, number> = {
  very_safe: 0,
  safe: 1,
  balanced: 2,
  aggressive: 3,
  high_risk: 4,
};
