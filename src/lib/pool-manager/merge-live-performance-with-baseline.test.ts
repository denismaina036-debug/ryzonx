import { describe, expect, it } from "vitest";
import { mergeLivePerformanceWithAdminBaseline } from "@/lib/pool-manager/merge-live-performance-with-baseline";
import type { PoolManagerLivePerformanceStatistics } from "@/domain/pool-manager/live-performance-statistics";

const liveBase: PoolManagerLivePerformanceStatistics = {
  computedAt: "2026-01-02T00:00:00.000Z",
  totalTrades: 2,
  closedTrades: 2,
  winningTrades: 1,
  losingTrades: 1,
  breakevenTrades: 0,
  winRatePct: 50,
  lossRatePct: 50,
  netProfit: 300,
  totalProfit: 500,
  totalLoss: 200,
  averageProfitPerTrade: 500,
  averageLossPerTrade: 200,
  profitFactor: 2.5,
  largestWin: 500,
  largestLoss: 200,
  currentWinningStreak: 0,
  currentLosingStreak: 1,
  bestTradingDay: "2026-01-01",
  bestTradingDayProfit: 500,
  worstTradingDay: "2026-01-02",
  worstTradingDayProfit: -200,
  averageTradeDurationHours: 2,
  totalTradingCycles: 1,
  completedCycles: 0,
  successfulCycles: 0,
  losingCycles: 0,
  averageCycleReturn: null,
  cycleSuccessRatePct: null,
};

describe("mergeLivePerformanceWithAdminBaseline", () => {
  it("returns admin baselines before platform trades exist", () => {
    const merged = mergeLivePerformanceWithAdminBaseline(
      {
        displayTradeCount: 100,
        winRatePct: 80,
        totalProfits: 50000,
        successfulCycles: 5,
        successRatio: 83.33,
      },
      null
    );

    expect(merged.displayTradeCount).toBe(100);
    expect(merged.winRatePct).toBe(80);
    expect(merged.totalProfits).toBe(50000);
    expect(merged.successfulCycles).toBe(5);
  });

  it("adds platform activity onto admin baselines instead of replacing them", () => {
    const merged = mergeLivePerformanceWithAdminBaseline(
      {
        displayTradeCount: 100,
        winRatePct: 80,
        totalProfits: 50000,
        averageTradeDurationHours: 4,
      },
      liveBase
    );

    expect(merged.displayTradeCount).toBe(102);
    expect(merged.totalProfits).toBe(50300);
    expect(merged.winRatePct).toBeCloseTo(79.412, 2);
    expect(merged.averageTradeDurationHours).toBeCloseTo(3.9607, 3);
  });
});
