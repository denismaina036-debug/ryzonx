import { describe, expect, it } from "vitest";
import { computeLifetimePoolPerformance } from "@/lib/investor/lifetime-pool-performance";

describe("computeLifetimePoolPerformance", () => {
  it("sums credited pool profits and keeps history after withdrawals", () => {
    const result = computeLifetimePoolPerformance(
      [
        { amount: 19894, created_at: "2026-07-30T10:00:00.000Z" },
        { amount: 5000, created_at: "2026-07-29T12:00:00.000Z" },
      ],
      9800
    );

    expect(result.lifetimeProfit).toBe(24894);
    expect(result.bestDayProfit).toBe(19894);
    expect(result.lifetimeProfitPct).toBeCloseTo(254.02, 2);
  });
});
