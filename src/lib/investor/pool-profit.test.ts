import { describe, expect, it } from "vitest";
import {
  normalizeProfitTransferAmount,
  resolveAvailablePoolProfit,
} from "@/lib/investor/pool-profit";

describe("resolveAvailablePoolProfit", () => {
  it("uses stored current value when it exceeds wallet-backed profit", () => {
    expect(
      resolveAvailablePoolProfit({
        invested: 100_000,
        currentValue: 203_182,
        realizedPnl: 103_000,
        unrealizedPnl: 0,
        profitWalletBalance: 0,
      })
    ).toBe(103_182);
  });

  it("uses profit wallet balance when present", () => {
    expect(
      resolveAvailablePoolProfit({
        invested: 50_000,
        currentValue: 153_182,
        realizedPnl: 0,
        unrealizedPnl: 0,
        profitWalletBalance: 103_182,
      })
    ).toBe(103_182);
  });
});

describe("normalizeProfitTransferAmount", () => {
  it("snaps full transfer requests to the exact available balance", () => {
    expect(normalizeProfitTransferAmount(103_182, 103_182)).toBe(103_182);
  });

  it("rejects amounts above available profit", () => {
    expect(() => normalizeProfitTransferAmount(103_183, 103_182)).toThrow(
      "Amount exceeds available pool profit."
    );
  });
});
