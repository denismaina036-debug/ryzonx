import { describe, expect, it } from "vitest";
import { computePoolManagerPerformanceStats } from "@/lib/pool-manager/compute-performance-stats";

describe("computePoolManagerPerformanceStats", () => {
  it("updates all trade metrics after a winning trade", () => {
    const stats = computePoolManagerPerformanceStats({
      trades: [
        {
          status: "closed",
          tradeResult: "profit",
          realizedPnl: 500,
          openedAt: "2026-01-01T10:00:00.000Z",
          closedAt: "2026-01-01T12:00:00.000Z",
        },
      ],
      cycles: [],
      computedAt: "2026-01-02T00:00:00.000Z",
    });

    expect(stats.closedTrades).toBe(1);
    expect(stats.winningTrades).toBe(1);
    expect(stats.losingTrades).toBe(0);
    expect(stats.winRatePct).toBe(100);
    expect(stats.lossRatePct).toBe(0);
    expect(stats.netProfit).toBe(500);
    expect(stats.largestWin).toBe(500);
    expect(stats.averageProfitPerTrade).toBe(500);
    expect(stats.currentWinningStreak).toBe(1);
    expect(stats.currentLosingStreak).toBe(0);
  });

  it("recalculates correctly after a losing trade", () => {
    const stats = computePoolManagerPerformanceStats({
      trades: [
        {
          status: "closed",
          tradeResult: "profit",
          realizedPnl: 500,
          openedAt: "2026-01-01T10:00:00.000Z",
          closedAt: "2026-01-01T12:00:00.000Z",
        },
        {
          status: "closed",
          tradeResult: "loss",
          realizedPnl: -200,
          openedAt: "2026-01-02T10:00:00.000Z",
          closedAt: "2026-01-02T12:00:00.000Z",
        },
      ],
      cycles: [],
    });

    expect(stats.closedTrades).toBe(2);
    expect(stats.winningTrades).toBe(1);
    expect(stats.losingTrades).toBe(1);
    expect(stats.winRatePct).toBe(50);
    expect(stats.lossRatePct).toBe(50);
    expect(stats.netProfit).toBe(300);
    expect(stats.largestLoss).toBe(200);
    expect(stats.averageLossPerTrade).toBe(200);
    expect(stats.currentWinningStreak).toBe(0);
    expect(stats.currentLosingStreak).toBe(1);
  });

  it("derives cycle success statistics from completed cycles", () => {
    const stats = computePoolManagerPerformanceStats({
      trades: [],
      cycles: [
        { status: "completed", currentCycleProfit: 1200 },
        { status: "completed", currentCycleProfit: -300 },
        { status: "trading", currentCycleProfit: 50 },
      ],
    });

    expect(stats.totalTradingCycles).toBe(3);
    expect(stats.completedCycles).toBe(2);
    expect(stats.successfulCycles).toBe(1);
    expect(stats.losingCycles).toBe(1);
    expect(stats.cycleSuccessRatePct).toBe(50);
    expect(stats.averageCycleReturn).toBe(450);
  });
});
