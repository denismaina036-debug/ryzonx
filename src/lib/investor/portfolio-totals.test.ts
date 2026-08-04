import { describe, expect, it } from "vitest";
import type { InvestorInvestmentSummary } from "@/features/investor/types/wallet";
import {
  computeDailyProfitPct,
  computeInvestorPortfolioTotals,
} from "@/lib/investor/portfolio-totals";

const sampleInvestment: InvestorInvestmentSummary = {
  balance: 200,
  poolProfit: 19894,
  participations: [
    {
      fundId: "fund-1",
      poolName: "Institutional Flow Capital",
      amountInvested: 9800,
      currentValue: 29694,
      poolProfit: 19894,
      projectedReturnPct: 100,
      projectedRoiMultiplier: 2,
      poolWinRate: 0,
      investmentStartDate: "2026-01-01",
      termEndDate: null,
      termEnded: false,
      poolDurationDays: 30,
      payoutDurationLabel: "30 days",
    },
  ],
};

describe("computeInvestorPortfolioTotals", () => {
  it("includes pool profit in portfolio value", () => {
    const totals = computeInvestorPortfolioTotals(sampleInvestment);
    expect(totals.portfolioValue).toBe(29894);
    expect(totals.investedCapital).toBe(9800);
    expect(totals.poolProfit).toBe(19894);
  });
});

describe("computeDailyProfitPct", () => {
  it("uses start-of-day portfolio value as the denominator", () => {
    expect(computeDailyProfitPct(29894, 19894)).toBeCloseTo(198.94, 2);
  });
});
