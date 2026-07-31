import type { PoolManagerStatField } from "@/domain/pool-manager/admin-statistics";

/** Derived from recorded trade entries and completed cycles (system-managed). */
export interface PoolManagerLivePerformanceStatistics {
  computedAt: string;
  totalTrades: number;
  closedTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winRatePct: number | null;
  lossRatePct: number | null;
  netProfit: number;
  totalProfit: number;
  totalLoss: number;
  averageProfitPerTrade: number | null;
  averageLossPerTrade: number | null;
  profitFactor: number | null;
  largestWin: number | null;
  largestLoss: number | null;
  currentWinningStreak: number;
  currentLosingStreak: number;
  bestTradingDay: string | null;
  bestTradingDayProfit: number | null;
  worstTradingDay: string | null;
  worstTradingDayProfit: number | null;
  averageTradeDurationHours: number | null;
  totalTradingCycles: number;
  completedCycles: number;
  successfulCycles: number;
  losingCycles: number;
  averageCycleReturn: number | null;
  cycleSuccessRatePct: number | null;
}

/** Admin statistics that auto-update from trading activity once trades exist. */
export const POOL_MANAGER_DYNAMIC_PERFORMANCE_FIELDS = [
  "winRatePct",
  "successRatio",
  "totalProfits",
  "averageTradeDurationHours",
  "successfulCycles",
  "displayTradeCount",
] as const satisfies readonly PoolManagerStatField[];

export type PoolManagerDynamicPerformanceField =
  (typeof POOL_MANAGER_DYNAMIC_PERFORMANCE_FIELDS)[number];

export function isPerformanceStatOverridden(
  field: PoolManagerStatField,
  overrides: PoolManagerStatField[] | null | undefined
): boolean {
  return (overrides ?? []).includes(field);
}
