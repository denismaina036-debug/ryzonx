import { describe, expect, it } from "vitest";
import {
  DUPLICATE_FUNDING_CYCLE_ERROR,
  selectFundingCycleForNewCopier,
} from "./funding-cycle-selector";

describe("funding cycle selector", () => {
  const cycle = (id: string, fundId: string, status: string, cycleNumber: number) => ({
    id,
    fund_id: fundId,
    status,
    cycle_number: cycleNumber,
  });

  it("returns the exact funding cycle and ignores trading and prepared siblings", () => {
    const result = selectFundingCycleForNewCopier(
      [
        cycle("trading", "fund", "trading", 1),
        cycle("funding", "fund", "funding", 2),
        cycle("prepared", "fund", "draft", 3),
      ],
      "fund"
    );

    expect(result?.id).toBe("funding");
  });

  it("returns none when no cycle is accepting new copiers", () => {
    expect(
      selectFundingCycleForNewCopier(
        [cycle("approved", "fund", "approved", 1), cycle("trading", "fund", "trading", 2)],
        "fund"
      )
    ).toBeNull();
  });

  it("rejects ambiguous funding state instead of choosing by order", () => {
    expect(() =>
      selectFundingCycleForNewCopier(
        [cycle("one", "fund", "funding", 1), cycle("two", "fund", "funding", 2)],
        "fund"
      )
    ).toThrow(DUPLICATE_FUNDING_CYCLE_ERROR);
  });
});
