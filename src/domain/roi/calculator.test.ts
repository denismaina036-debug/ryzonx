import { describe, expect, it } from "vitest";
import {
  buildRoiPreview,
  calculateProjectedPayout,
  isTargetFulfilled,
  resolveInvestmentLevel,
  resolveMultiplier,
} from "@/domain/roi/calculator";
import { calculateRoiV2Distribution } from "@/lib/financial/roi-v2-distribution";
import { PLATFORM_SERVICE_FEE_RATE } from "@/constants/profit-distribution";

const LEVELS = [
  { id: "starter", name: "Starter", minAmount: 100, maxAmount: 1000, sortOrder: 1, isActive: true, createdAt: "", updatedAt: "" },
  { id: "growth", name: "Growth", minAmount: 1001, maxAmount: 5000, sortOrder: 2, isActive: true, createdAt: "", updatedAt: "" },
  { id: "pro", name: "Professional", minAmount: 5001, maxAmount: null, sortOrder: 3, isActive: true, createdAt: "", updatedAt: "" },
];

const MULTIPLIERS = [
  { id: "m1", fundId: "f1", investmentLevelId: "starter", multiplier: 2.0, level: LEVELS[0] },
  { id: "m2", fundId: "f1", investmentLevelId: "growth", multiplier: 2.3, level: LEVELS[1] },
  { id: "m3", fundId: "f1", investmentLevelId: "pro", multiplier: 2.5, level: LEVELS[2] },
];

describe("ROI calculator", () => {
  it("resolves investment levels at boundaries", () => {
    expect(resolveInvestmentLevel(100, LEVELS)?.id).toBe("starter");
    expect(resolveInvestmentLevel(1000, LEVELS)?.id).toBe("starter");
    expect(resolveInvestmentLevel(1001, LEVELS)?.id).toBe("growth");
    expect(resolveInvestmentLevel(5000, LEVELS)?.id).toBe("growth");
    expect(resolveInvestmentLevel(5001, LEVELS)?.id).toBe("pro");
    expect(resolveInvestmentLevel(10000, LEVELS)?.id).toBe("pro");
  });

  it("calculates projected payouts", () => {
    const cases: Array<[number, number]> = [
      [100, 200],
      [750, 1500],
      [1000, 2000],
      [1001, 2302.3],
      [3500, 8050],
      [5000, 11500],
      [5001, 12502.5],
      [10000, 25000],
    ];

    for (const [amount, expected] of cases) {
      const level = resolveInvestmentLevel(amount, LEVELS)!;
      const multiplier = resolveMultiplier(level.id, MULTIPLIERS)!;
      expect(calculateProjectedPayout(amount, multiplier)).toBe(expected);
    }
  });

  it("builds live preview with duration label", () => {
    const preview = buildRoiPreview({
      amount: 1000,
      levels: LEVELS,
      multipliers: MULTIPLIERS,
      returnDurationPreset: "daily",
      returnDurationValue: 1,
      returnDurationUnit: "days",
    });
    expect(preview.investmentLevel?.name).toBe("Starter");
    expect(preview.multiplier).toBe(2);
    expect(preview.projectedPayout).toBe(2000);
    expect(preview.returnDurationLabel).toBe("Daily");
  });

  it("builds hourly duration label from hour count", () => {
    const preview = buildRoiPreview({
      amount: 1000,
      levels: LEVELS,
      multipliers: MULTIPLIERS,
      returnDurationPreset: "hourly",
      returnDurationValue: 12,
      returnDurationUnit: "hours",
    });
    expect(preview.returnDurationLabel).toBe("12 Hours");
  });

  it("tracks target fulfillment", () => {
    expect(isTargetFulfilled(1000, 2, 999)).toBe(false);
    expect(isTargetFulfilled(1000, 2, 1000)).toBe(true);
  });
});

describe("ROI v2 distribution", () => {
  it("deducts platform fee before distribution", () => {
    const result = calculateRoiV2Distribution({
      grossTradingProfit: 10000,
      platformServiceFeeRate: PLATFORM_SERVICE_FEE_RATE,
      allocations: [
        {
          allocationId: "a1",
          investorId: "i1",
          capitalBasis: 1000,
          roiMultiplier: 2,
          cumulativeRealisedReturn: 0,
          targetFulfilled: false,
          investmentLevelId: "starter",
        },
      ],
    });

    expect(result.platformServiceFee).toBe(250);
    expect(result.netDistributableProfit).toBe(9750);
  });

  it("distributes losses proportionally", () => {
    const result = calculateRoiV2Distribution({
      grossTradingProfit: -1000,
      allocations: [
        {
          allocationId: "a1",
          investorId: "i1",
          capitalBasis: 750,
          roiMultiplier: 2,
          cumulativeRealisedReturn: 0,
          targetFulfilled: false,
          investmentLevelId: "starter",
        },
        {
          allocationId: "a2",
          investorId: "i2",
          capitalBasis: 250,
          roiMultiplier: 2,
          cumulativeRealisedReturn: 0,
          targetFulfilled: false,
          investmentLevelId: "starter",
        },
      ],
    });

    expect(result.netDistributableProfit).toBe(-1000);
    expect(result.investorAllocations[0]?.profitShare).toBe(-750);
    expect(result.investorAllocations[1]?.profitShare).toBe(-250);
  });

  it("gives each investor only their proportional share of a cycle loss", () => {
    const result = calculateRoiV2Distribution({
      grossTradingProfit: -400,
      allocations: [
        {
          allocationId: "a1",
          investorId: "i1",
          capitalBasis: 500,
          roiMultiplier: 2,
          cumulativeRealisedReturn: 0,
          targetFulfilled: false,
          investmentLevelId: "starter",
        },
        {
          allocationId: "a2",
          investorId: "i2",
          capitalBasis: 500,
          roiMultiplier: 2,
          cumulativeRealisedReturn: 0,
          targetFulfilled: false,
          investmentLevelId: "starter",
        },
      ],
    });

    expect(result.investorAllocations.map((allocation) => allocation.profitShare)).toEqual([
      -200,
      -200,
    ]);
  });

  it("caps investor profit at remaining target and sends surplus to PM", () => {
    const result = calculateRoiV2Distribution({
      grossTradingProfit: 50000,
      allocations: [
        {
          allocationId: "a1",
          investorId: "i1",
          capitalBasis: 1000,
          roiMultiplier: 2,
          cumulativeRealisedReturn: 0,
          targetFulfilled: false,
          investmentLevelId: "starter",
        },
      ],
    });

    expect(result.investorAllocations[0]?.profitShare).toBe(1000);
    expect(result.allocationUpdates[0]?.targetFulfilled).toBe(true);
    expect(result.poolManagerSurplus).toBe(47750);
  });

  it("preserves money — no creation from rounding", () => {
    const gross = 1234.56;
    const allocations = [
      {
        allocationId: "a1",
        investorId: "i1",
        capitalBasis: 333.33,
        roiMultiplier: 2.3,
        cumulativeRealisedReturn: 12.34,
        targetFulfilled: false,
        investmentLevelId: "growth",
      },
      {
        allocationId: "a2",
        investorId: "i2",
        capitalBasis: 666.67,
        roiMultiplier: 2.5,
        cumulativeRealisedReturn: 0,
        targetFulfilled: false,
        investmentLevelId: "pro",
      },
    ];

    const result = calculateRoiV2Distribution({ grossTradingProfit: gross, allocations });
    const investorTotal = result.investorAllocations.reduce((s, a) => s + a.profitShare, 0);
    const distributed = investorTotal + result.poolManagerSurplus;

    expect(Math.abs(distributed - result.netDistributableProfit)).toBeLessThanOrEqual(0.02);
  });
});
