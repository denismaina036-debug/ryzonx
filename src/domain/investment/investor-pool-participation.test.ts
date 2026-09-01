import { describe, expect, it } from "vitest";
import {
  resolveInvestorCapitalExposure,
  resolveInvestorDisplayCapital,
  resolvePostCycleCapitalAmount,
  shouldShowPostCycleChoices,
} from "@/domain/investment/investor-pool-participation";

const sampleSettlement = {
  id: "s1",
  investmentCycleId: "c1",
  fundId: "f1",
  investorId: "i1",
  principalAmount: 20_000,
  profitAmount: 0,
  status: "pending_choice" as const,
  profitResolved: true,
  capitalResolved: false,
  capitalWithdrawalTransactionId: null,
  poolName: "Pool",
  cycleName: "Cycle 1",
  cycleNumber: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("resolveInvestorDisplayCapital", () => {
  it("uses cycle allocation during an active funding cycle", () => {
    expect(
      resolveInvestorDisplayCapital({
        hasActiveTradingCycle: false,
        hasActiveFundingCycle: true,
        portfolioInvested: 10_000,
        pendingSettlement: null,
        cycleAllocationAmount: 200,
      })
    ).toBe(200);
  });

  it("uses cycle allocation during an active trading cycle", () => {
    expect(
      resolveInvestorDisplayCapital({
        hasActiveTradingCycle: true,
        portfolioInvested: 10_000,
        pendingSettlement: null,
        cycleAllocationAmount: 20_000,
      })
    ).toBe(20_000);
  });

  it("uses settlement principal after cycle completion", () => {
    expect(
      resolveInvestorDisplayCapital({
        hasActiveTradingCycle: false,
        portfolioInvested: 10_000,
        pendingSettlement: sampleSettlement,
        cycleAllocationAmount: null,
      })
    ).toBe(20_000);
  });
});

describe("resolveInvestorCapitalExposure", () => {
  it("counts each pool once when portfolio and cycle allocation match", () => {
    expect(
      resolveInvestorCapitalExposure(
        [{ fundId: "f1", amountInvested: 200 }],
        [{ fundId: "f1", amount: 200, status: "funding_confirmed" }]
      )
    ).toBe(200);
  });

  it("sums distinct pools without double counting", () => {
    expect(
      resolveInvestorCapitalExposure(
        [
          { fundId: "f1", amountInvested: 200 },
          { fundId: "f2", amountInvested: 200 },
        ],
        [
          { fundId: "f1", amount: 200, status: "funding_confirmed" },
          { fundId: "f2", amount: 200, status: "funding_confirmed" },
        ]
      )
    ).toBe(400);
  });

  it("does not count capital that has already been returned", () => {
    expect(
      resolveInvestorCapitalExposure(
        [{ fundId: "f1", amountInvested: 200 }],
        [
          {
            fundId: "f1",
            amount: 200,
            returnedCapitalAmount: 200,
            status: "distributed",
          },
        ]
      )
    ).toBe(0);
  });

  it("counts only the remaining returnable capital", () => {
    expect(
      resolveInvestorCapitalExposure(
        [{ fundId: "f1", amountInvested: 500 }],
        [
          {
            fundId: "f1",
            amount: 500,
            returnedCapitalAmount: 200,
            status: "distributed",
          },
        ]
      )
    ).toBe(300);
  });
});

describe("resolvePostCycleCapitalAmount", () => {
  it("falls back to displayed capital when settlement is missing", () => {
    expect(
      resolvePostCycleCapitalAmount({
        pendingSettlement: null,
        displayCapitalInvested: 15_000,
      })
    ).toBe(15_000);
  });
});

describe("shouldShowPostCycleChoices", () => {
  it("hides capital-only choices while a trading cycle is active", () => {
    expect(
      shouldShowPostCycleChoices({
        hasActiveTradingCycle: true,
        pendingSettlement: sampleSettlement,
        displayCapitalInvested: 20_000,
      })
    ).toBe(false);
  });

  it("hides choices while a funding cycle is open", () => {
    expect(
      shouldShowPostCycleChoices({
        hasActiveTradingCycle: false,
        hasActiveFundingCycle: true,
        pendingSettlement: null,
        displayCapitalInvested: 20_000,
      })
    ).toBe(false);
  });

  it("shows choices when a pool has no trading cycle and invested capital", () => {
    expect(
      shouldShowPostCycleChoices({
        hasActiveTradingCycle: false,
        hasActiveFundingCycle: false,
        pendingSettlement: null,
        displayCapitalInvested: 20_000,
      })
    ).toBe(true);
  });

  it("shows choices when a pending settlement exists", () => {
    expect(
      shouldShowPostCycleChoices({
        hasActiveTradingCycle: false,
        pendingSettlement: sampleSettlement,
        displayCapitalInvested: 20_000,
      })
    ).toBe(true);
  });

  it("shows choices for unresolved settlements even when a funding cycle is open", () => {
    expect(
      shouldShowPostCycleChoices({
        hasActiveTradingCycle: false,
        hasActiveFundingCycle: true,
        pendingSettlement: sampleSettlement,
        displayCapitalInvested: 20_000,
      })
    ).toBe(true);
  });

  it("hides completed-cycle actions after both profit and capital are resolved", () => {
    expect(
      shouldShowPostCycleChoices({
        hasActiveTradingCycle: false,
        hasActiveFundingCycle: false,
        pendingSettlement: {
          ...sampleSettlement,
          profitAmount: 1_350,
          profitResolved: true,
          capitalResolved: true,
          status: "closed",
        },
        displayCapitalInvested: 0,
        poolProfit: 0,
      })
    ).toBe(false);
  });

  it("keeps completed-cycle profit actionable while a newer cycle is trading", () => {
    expect(
      shouldShowPostCycleChoices({
        hasActiveTradingCycle: true,
        pendingSettlement: {
          ...sampleSettlement,
          profitAmount: 9_780.64,
          profitResolved: false,
        },
        displayCapitalInvested: 20_000,
        poolProfit: 9_780.64,
      })
    ).toBe(true);
  });

  it("keeps wallet-backed pool profit actionable while a newer cycle is trading", () => {
    expect(
      shouldShowPostCycleChoices({
        hasActiveTradingCycle: true,
        pendingSettlement: null,
        displayCapitalInvested: 20_000,
        poolProfit: 9_780.64,
      })
    ).toBe(true);
  });

  it("shows choices when distributed pool profit remains even if a funding cycle is open", () => {
    expect(
      shouldShowPostCycleChoices({
        hasActiveTradingCycle: false,
        hasActiveFundingCycle: true,
        pendingSettlement: null,
        displayCapitalInvested: 20_000,
        poolProfit: 34_500,
      })
    ).toBe(true);
  });
});
