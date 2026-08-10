import { describe, expect, it } from "vitest";
import {
  resolveInvestorDisplayCapital,
  shouldShowPostCycleChoices,
} from "@/domain/investment/investor-pool-participation";

describe("resolveInvestorDisplayCapital", () => {
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
        pendingSettlement: {
          id: "s1",
          investmentCycleId: "c1",
          fundId: "f1",
          investorId: "i1",
          principalAmount: 20_000,
          profitAmount: 0,
          status: "pending_choice",
          profitResolved: true,
          capitalResolved: false,
          capitalWithdrawalTransactionId: null,
          poolName: "Pool",
          cycleName: "Cycle 1",
          cycleNumber: 1,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        cycleAllocationAmount: null,
      })
    ).toBe(20_000);
  });
});

describe("shouldShowPostCycleChoices", () => {
  it("hides choices while a trading cycle is active", () => {
    expect(
      shouldShowPostCycleChoices({
        hasActiveTradingCycle: true,
        pendingSettlement: {
          id: "s1",
          investmentCycleId: "c1",
          fundId: "f1",
          investorId: "i1",
          principalAmount: 20_000,
          profitAmount: 0,
          status: "pending_choice",
          profitResolved: false,
          capitalResolved: false,
          capitalWithdrawalTransactionId: null,
          poolName: "Pool",
          cycleName: "Cycle 1",
          cycleNumber: 1,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      })
    ).toBe(false);
  });

  it("shows choices when a pool has no trading cycle and pending settlement", () => {
    expect(
      shouldShowPostCycleChoices({
        hasActiveTradingCycle: false,
        pendingSettlement: {
          id: "s1",
          investmentCycleId: "c1",
          fundId: "f1",
          investorId: "i1",
          principalAmount: 20_000,
          profitAmount: 0,
          status: "pending_choice",
          profitResolved: false,
          capitalResolved: false,
          capitalWithdrawalTransactionId: null,
          poolName: "Pool",
          cycleName: "Cycle 1",
          cycleNumber: 1,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      })
    ).toBe(true);
  });
});
