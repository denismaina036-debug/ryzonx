import type { PoolManagerAdminStatistics } from "@/domain/pool-manager/admin-statistics";
import type { PoolManagerLivePerformanceStatistics } from "@/domain/pool-manager/live-performance-statistics";
import { resolvePublicDisplayCount } from "@/features/marketplace/utils/marketplace-pool-card-presentation";

function toNumber(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return value;
}

/** Combine admin baseline profile stats with platform trade/cycle activity. */
export function mergeLivePerformanceWithAdminBaseline(
  adminStats: PoolManagerAdminStatistics,
  live: PoolManagerLivePerformanceStatistics | null | undefined
): Partial<PoolManagerAdminStatistics> {
  const tradeSeed = Math.max(0, toNumber(adminStats.displayTradeCount));
  const successfulSeed = Math.max(0, toNumber(adminStats.successfulCycles));
  const adminWinRate = adminStats.winRatePct;
  const adminSuccessRatio = adminStats.successRatio;
  const adminTotalProfits = adminStats.totalProfits;
  const adminDuration = adminStats.averageTradeDurationHours;

  if (!live || live.closedTrades === 0) {
    return {
      winRatePct: adminWinRate ?? null,
      successRatio: adminSuccessRatio ?? null,
      totalProfits: adminTotalProfits ?? null,
      averageTradeDurationHours: adminDuration ?? null,
      successfulCycles: successfulSeed > 0 ? successfulSeed : null,
      displayTradeCount: tradeSeed > 0 ? tradeSeed : null,
    };
  }

  let baselineWins = 0;
  let baselineLosses = 0;
  if (tradeSeed > 0 && adminWinRate != null && Number.isFinite(adminWinRate)) {
    baselineWins = Math.round(tradeSeed * (adminWinRate / 100));
    baselineLosses = Math.max(0, tradeSeed - baselineWins);
  }

  const combinedWins = baselineWins + live.winningTrades;
  const combinedLosses = baselineLosses + live.losingTrades;
  const decisiveTrades = combinedWins + combinedLosses;
  const winRatePct =
    decisiveTrades > 0
      ? (combinedWins / decisiveTrades) * 100
      : adminWinRate ?? live.winRatePct;

  const combinedSuccessfulCycles = successfulSeed + live.successfulCycles;

  let baselineCompletedCycles = 0;
  if (successfulSeed > 0 && adminSuccessRatio != null && adminSuccessRatio > 0) {
    baselineCompletedCycles = Math.max(
      successfulSeed,
      Math.round(successfulSeed / (adminSuccessRatio / 100))
    );
  } else if (successfulSeed > 0) {
    baselineCompletedCycles = successfulSeed;
  }

  const combinedCompletedCycles = baselineCompletedCycles + live.completedCycles;
  const successRatio =
    combinedCompletedCycles > 0
      ? (combinedSuccessfulCycles / combinedCompletedCycles) * 100
      : adminSuccessRatio ?? live.cycleSuccessRatePct ?? winRatePct ?? null;

  const totalProfits = toNumber(adminTotalProfits) + live.netProfit;

  const adminDurationTradeCount = tradeSeed;
  const liveDurationTradeCount = live.closedTrades;
  const totalDurationTrades = adminDurationTradeCount + liveDurationTradeCount;
  const averageTradeDurationHours =
    totalDurationTrades > 0
      ? ((toNumber(adminDuration) * adminDurationTradeCount) +
          toNumber(live.averageTradeDurationHours) * liveDurationTradeCount) /
        totalDurationTrades
      : adminDuration ?? live.averageTradeDurationHours ?? null;

  const displayTradeCount =
    tradeSeed > 0
      ? resolvePublicDisplayCount(tradeSeed, live.closedTrades)
      : live.closedTrades;

  return {
    winRatePct,
    successRatio,
    totalProfits,
    averageTradeDurationHours,
    successfulCycles: combinedSuccessfulCycles,
    displayTradeCount,
  };
}
