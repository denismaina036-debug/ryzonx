import { describe, expect, it } from "vitest";
import { computeOwnershipPct, distributeProRataByOwnership } from "@/lib/investment-engine/ownership";
import {
  calculateProgressiveMultiplier,
  calculateOwnershipOnlyDistribution,
  calculateRoiV2Distribution,
} from "@/lib/financial/roi-v2-distribution";
import { computeCycleRealizedTradingProfit } from "@/lib/financial/profit-distribution-calculator";
import type { TradeEntry } from "@/domain/trading-journal/types";

describe("investment engine", () => {
  it("computes ownership percentages from pool capital", () => {
    expect(computeOwnershipPct(250, 5000)).toBe(5);
    expect(computeOwnershipPct(0, 5000)).toBe(0);
  });

  it("distributes pro-rata without rounding drift", () => {
    const shares = distributeProRataByOwnership(100, [
      { key: "a", capital: 250 },
      { key: "b", capital: 750 },
    ]);
    expect(shares.reduce((s, x) => s + x.share, 0)).toBe(100);
    expect(shares[0]!.share).toBe(25);
    expect(shares[1]!.share).toBe(75);
  });

  it("interpolates progressive ROI multipliers within a tier", () => {
    const mult = calculateProgressiveMultiplier({
      amount: 3000,
      level: {
        id: "g",
        name: "Growth",
        minAmount: 1001,
        maxAmount: 5000,
        sortOrder: 2,
        isActive: true,
        createdAt: "",
        updatedAt: "",
      },
      minMultiplier: 1.5,
      maxMultiplier: 2.5,
    });
    expect(mult).toBeGreaterThan(1.5);
    expect(mult).toBeLessThan(2.5);
  });

  it("accumulates cycle profit from realized_pnl without mutating capital", () => {
    const trades = [
      { status: "closed", realizedPnl: 12000, entryPrice: 1, exitPrice: 1, quantity: 1, direction: "long" },
      { status: "closed", realizedPnl: -2000, entryPrice: 1, exitPrice: 1, quantity: 1, direction: "long" },
    ] as TradeEntry[];
    expect(computeCycleRealizedTradingProfit(trades)).toBe(10000);
  });

  it("settles with platform fee and ownership distribution", () => {
    const result = calculateOwnershipOnlyDistribution({
      grossTradingProfit: 10000,
      platformServiceFeeRate: 0.025,
      allocations: [
        { allocationId: "a1", investorId: "i1", capitalBasis: 2500, ownershipPct: 0.5 },
        { allocationId: "a2", investorId: "i2", capitalBasis: 2500, ownershipPct: 0.5 },
      ],
    });
    expect(result.platformServiceFee).toBe(250);
    expect(result.netDistributableProfit).toBe(9750);
    expect(result.investorDistributionTotal).toBe(9750);
    expect(result.poolManagerEarnings).toBe(0);
  });

  it("applies ROI target caps before PM surplus", () => {
    const result = calculateRoiV2Distribution({
      grossTradingProfit: 50000,
      platformServiceFeeRate: 0.025,
      allocations: [
        {
          allocationId: "a1",
          investorId: "i1",
          capitalBasis: 1000,
          roiMultiplier: 2,
          cumulativeRealisedReturn: 0,
          targetFulfilled: false,
          investmentLevelId: null,
        },
      ],
    });
    expect(result.investorAllocations[0]!.profitShare).toBe(1000);
    expect(result.poolManagerEarnings).toBeGreaterThan(0);
  });
});
