export const TRADE_ENTRY_RESULTS = ["profit", "loss", "breakeven"] as const;
export type TradeEntryResult = (typeof TRADE_ENTRY_RESULTS)[number];

export const TRADE_ENTRY_RESULT_LABELS: Record<TradeEntryResult, string> = {
  profit: "Profit",
  loss: "Loss",
  breakeven: "Breakeven",
};

export const ADMIN_PM_STATS_AUDIT_ACTIONS = {
  STAT_UPDATED: "admin_pm_stat_updated",
  STATS_RESET: "admin_pm_stats_reset",
  POOL_SECURITY_UPDATED: "admin_pool_security_updated",
} as const;

export const POOL_MANAGER_STATS_ENTITY = "pool_manager";
