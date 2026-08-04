import { describe, expect, it } from "vitest";
import {
  computeProjectedProfitShares,
  computeSingleProjectedProfitShare,
} from "@/lib/financial/projected-cycle-profit";

describe("projected-cycle-profit", () => {
  it("splits positive cycle profit pro-rata without changing totals materially", () => {
    const shares = computeProjectedProfitShares(253, [
      { id: "1", investorId: "a", amount: 1000, sharePct: 66.67 },
      { id: "2", investorId: "b", amount: 500, sharePct: 33.33 },
    ]);

    expect(shares).toHaveLength(2);
    expect(shares[0]!.projectedProfit + shares[1]!.projectedProfit).toBe(253);
  });

  it("returns negative projected profit for losses", () => {
    const share = computeSingleProjectedProfitShare(-100, 1000, 2000);
    expect(share).toBe(-50);
  });
});
