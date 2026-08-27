import { describe, expect, it } from "vitest";
import {
  computeProjectedProfitShares,
  computeSingleProjectedProfitShare,
} from "@/lib/financial/projected-cycle-profit";

describe("projected-cycle-profit", () => {
  it("deducts the 2.5% fee once and splits positive cycle profit pro-rata", () => {
    const shares = computeProjectedProfitShares(253, [
      { id: "1", investorId: "a", amount: 1000, sharePct: 66.67 },
      { id: "2", investorId: "b", amount: 500, sharePct: 33.33 },
    ]);

    expect(shares).toHaveLength(2);
    expect(shares[0]!.projectedProfit + shares[1]!.projectedProfit).toBe(246.68);
  });

  it("shows the investor share after fee rather than the whole projected pool profit", () => {
    expect(computeSingleProjectedProfitShare(10_000, 5_000, 100_000)).toBe(487.5);
  });

  it("returns negative projected profit for losses", () => {
    const share = computeSingleProjectedProfitShare(-100, 1000, 2000);
    expect(share).toBe(-50);
  });

  it("reconciles the required multi-investor fee example", () => {
    const shares = computeProjectedProfitShares(1_000, [
      { id: "1", investorId: "a", amount: 100, sharePct: 25 },
      { id: "2", investorId: "b", amount: 300, sharePct: 75 },
    ]);

    expect(shares.map((row) => row.projectedProfit)).toEqual([243.75, 731.25]);
    expect(shares.reduce((sum, row) => sum + row.projectedProfit, 0)).toBe(975);
  });
});
