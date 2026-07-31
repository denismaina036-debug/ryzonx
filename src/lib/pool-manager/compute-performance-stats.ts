import type { TradeEntryResult, TradeEntryStatus } from "@/constants/trade-entry";
import type { PoolManagerLivePerformanceStatistics } from "@/domain/pool-manager/live-performance-statistics";

export interface TradeEntryPerformanceInput {
  status: TradeEntryStatus;
  tradeResult: TradeEntryResult | null;
  realizedPnl: number | null;
  openedAt: string | null;
  closedAt: string | null;
}

export interface CyclePerformanceInput {
  status: string;
  currentCycleProfit: number;
}

type TradeOutcome = "win" | "loss" | "breakeven" | "open";

function toNumber(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return value;
}

function classifyTradeOutcome(entry: TradeEntryPerformanceInput): TradeOutcome {
  if (entry.status !== "closed") return "open";

  if (entry.tradeResult === "profit") return "win";
  if (entry.tradeResult === "loss") return "loss";
  if (entry.tradeResult === "breakeven") return "breakeven";

  const pnl = toNumber(entry.realizedPnl);
  if (pnl > 0) return "win";
  if (pnl < 0) return "loss";
  return "breakeven";
}

function tradePnl(entry: TradeEntryPerformanceInput): number {
  return toNumber(entry.realizedPnl);
}

function dayKey(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function computeStreaks(
  closedEntries: TradeEntryPerformanceInput[]
): { currentWinningStreak: number; currentLosingStreak: number } {
  const sorted = [...closedEntries].sort((a, b) => {
    const aTime = new Date(a.closedAt ?? 0).getTime();
    const bTime = new Date(b.closedAt ?? 0).getTime();
    return aTime - bTime;
  });

  let currentWinningStreak = 0;
  let currentLosingStreak = 0;

  for (const entry of sorted) {
    const outcome = classifyTradeOutcome(entry);
    if (outcome === "win") {
      currentWinningStreak += 1;
      currentLosingStreak = 0;
    } else if (outcome === "loss") {
      currentLosingStreak += 1;
      currentWinningStreak = 0;
    } else {
      currentWinningStreak = 0;
      currentLosingStreak = 0;
    }
  }

  return { currentWinningStreak, currentLosingStreak };
}

function computeDailyPnl(
  closedEntries: TradeEntryPerformanceInput[]
): { bestTradingDay: string | null; bestTradingDayProfit: number | null; worstTradingDay: string | null; worstTradingDayProfit: number | null } {
  const byDay = new Map<string, number>();

  for (const entry of closedEntries) {
    const key = dayKey(entry.closedAt);
    if (!key) continue;
    byDay.set(key, (byDay.get(key) ?? 0) + tradePnl(entry));
  }

  if (byDay.size === 0) {
    return {
      bestTradingDay: null,
      bestTradingDayProfit: null,
      worstTradingDay: null,
      worstTradingDayProfit: null,
    };
  }

  let bestTradingDay: string | null = null;
  let bestTradingDayProfit: number | null = null;
  let worstTradingDay: string | null = null;
  let worstTradingDayProfit: number | null = null;

  for (const [day, profit] of byDay.entries()) {
    if (bestTradingDayProfit == null || profit > bestTradingDayProfit) {
      bestTradingDay = day;
      bestTradingDayProfit = profit;
    }
    if (worstTradingDayProfit == null || profit < worstTradingDayProfit) {
      worstTradingDay = day;
      worstTradingDayProfit = profit;
    }
  }

  return { bestTradingDay, bestTradingDayProfit, worstTradingDay, worstTradingDayProfit };
}

/** Recalculate manager performance statistics from trade history and cycles. */
export function computePoolManagerPerformanceStats(input: {
  trades: TradeEntryPerformanceInput[];
  cycles: CyclePerformanceInput[];
  computedAt?: string;
}): PoolManagerLivePerformanceStatistics {
  const countedTrades = input.trades.filter(
    (entry) => entry.status !== "draft" && entry.status !== "archived"
  );
  const closedEntries = input.trades.filter((entry) => entry.status === "closed");

  const winningTrades = closedEntries.filter(
    (entry) => classifyTradeOutcome(entry) === "win"
  ).length;
  const losingTrades = closedEntries.filter(
    (entry) => classifyTradeOutcome(entry) === "loss"
  ).length;
  const breakevenTrades = closedEntries.filter(
    (entry) => classifyTradeOutcome(entry) === "breakeven"
  ).length;

  const closedTrades = winningTrades + losingTrades + breakevenTrades;
  const decisiveTrades = winningTrades + losingTrades;

  const profitValues = closedEntries
    .map(tradePnl)
    .filter((value) => value > 0);
  const lossValues = closedEntries
    .map(tradePnl)
    .filter((value) => value < 0)
    .map((value) => Math.abs(value));

  const totalProfit = profitValues.reduce((sum, value) => sum + value, 0);
  const totalLoss = lossValues.reduce((sum, value) => sum + value, 0);
  const netProfit = closedEntries.reduce((sum, entry) => sum + tradePnl(entry), 0);

  const winRatePct =
    decisiveTrades > 0 ? (winningTrades / decisiveTrades) * 100 : null;
  const lossRatePct =
    decisiveTrades > 0 ? (losingTrades / decisiveTrades) * 100 : null;

  const averageProfitPerTrade =
    profitValues.length > 0
      ? totalProfit / profitValues.length
      : null;
  const averageLossPerTrade =
    lossValues.length > 0 ? totalLoss / lossValues.length : null;

  const profitFactor =
    totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? totalProfit : null;

  const largestWin = profitValues.length > 0 ? Math.max(...profitValues) : null;
  const largestLoss = lossValues.length > 0 ? Math.max(...lossValues) : null;

  const holdingDurations = closedEntries
    .filter((entry) => entry.openedAt && entry.closedAt)
    .map((entry) => {
      const ms =
        new Date(entry.closedAt!).getTime() - new Date(entry.openedAt!).getTime();
      return ms / (1000 * 60 * 60);
    });

  const averageTradeDurationHours =
    holdingDurations.length > 0
      ? holdingDurations.reduce((sum, hours) => sum + hours, 0) /
        holdingDurations.length
      : null;

  const completedCycles = input.cycles.filter(
    (cycle) => cycle.status === "completed" || cycle.status === "archived"
  );
  const successfulCycles = completedCycles.filter(
    (cycle) => cycle.currentCycleProfit > 0
  ).length;
  const losingCycles = completedCycles.filter(
    (cycle) => cycle.currentCycleProfit < 0
  ).length;

  const averageCycleReturn =
    completedCycles.length > 0
      ? completedCycles.reduce((sum, cycle) => sum + cycle.currentCycleProfit, 0) /
        completedCycles.length
      : null;

  const cycleSuccessRatePct =
    completedCycles.length > 0
      ? (successfulCycles / completedCycles.length) * 100
      : null;

  const streaks = computeStreaks(closedEntries);
  const daily = computeDailyPnl(closedEntries);

  return {
    computedAt: input.computedAt ?? new Date().toISOString(),
    totalTrades: countedTrades.length,
    closedTrades,
    winningTrades,
    losingTrades,
    breakevenTrades,
    winRatePct,
    lossRatePct,
    netProfit,
    totalProfit,
    totalLoss,
    averageProfitPerTrade,
    averageLossPerTrade,
    profitFactor,
    largestWin,
    largestLoss,
    currentWinningStreak: streaks.currentWinningStreak,
    currentLosingStreak: streaks.currentLosingStreak,
    bestTradingDay: daily.bestTradingDay,
    bestTradingDayProfit: daily.bestTradingDayProfit,
    worstTradingDay: daily.worstTradingDay,
    worstTradingDayProfit: daily.worstTradingDayProfit,
    averageTradeDurationHours,
    totalTradingCycles: input.cycles.length,
    completedCycles: completedCycles.length,
    successfulCycles,
    losingCycles,
    averageCycleReturn,
    cycleSuccessRatePct,
  };
}
