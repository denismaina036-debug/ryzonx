import { describe, expect, it } from "vitest";
import { resolvePoolLiveRaisedCapital } from "@/domain/investment/cycle-metrics";

describe("resolvePoolLiveRaisedCapital", () => {
  it("uses cycle raised capital only when a cycle is active", () => {
    expect(
      resolvePoolLiveRaisedCapital({
        hasActiveCycle: true,
        cycleRaisedCapital: 47_700,
        portfolioInvestedTotal: 47_500,
        displayRaisedCapital: 65_000,
      })
    ).toBe(47_700);
  });

  it("adds legacy display seed only when no cycle is active", () => {
    expect(
      resolvePoolLiveRaisedCapital({
        hasActiveCycle: false,
        cycleRaisedCapital: 0,
        portfolioInvestedTotal: 47_700,
        displayRaisedCapital: 65_000,
      })
    ).toBe(112_700);
  });
});
