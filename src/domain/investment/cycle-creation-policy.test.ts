import { describe, expect, it } from "vitest";
import { evaluateCycleCreation, type CycleCreationState } from "./cycle-creation-policy";

function cycle(
  status: CycleCreationState["status"],
  overrides: Partial<CycleCreationState> = {}
): CycleCreationState {
  return {
    cycleNumber: 1,
    status,
    raisedCapital: 0,
    maxCapacity: 10_000,
    ...overrides,
  };
}

describe("evaluateCycleCreation", () => {
  it("allows a new funding cycle while the latest cycle is trading", () => {
    expect(evaluateCycleCreation([cycle("trading")], true)).toEqual({
      allowed: true,
      reason: null,
    });
  });

  it("keeps an unfinished funding cycle as the only open funding round", () => {
    expect(evaluateCycleCreation([cycle("funding", { raisedCapital: 4_000 })], true)).toEqual({
      allowed: false,
      reason: "funding_cycle_open",
    });
  });

  it("preserves the existing ability to open the next cycle once funding is full", () => {
    expect(
      evaluateCycleCreation(
        [cycle("funding", { raisedCapital: 10_000, maxCapacity: 10_000 })],
        true
      )
    ).toEqual({ allowed: true, reason: null });
  });

  it("uses the highest cycle number even when cycles are unsorted", () => {
    expect(
      evaluateCycleCreation(
        [
          cycle("funding", { cycleNumber: 2, raisedCapital: 1_000 }),
          cycle("trading", { cycleNumber: 1 }),
        ],
        true
      )
    ).toEqual({ allowed: false, reason: "funding_cycle_open" });
  });

  it("blocks creation while distribution is in progress", () => {
    expect(evaluateCycleCreation([cycle("distribution")], true)).toEqual({
      allowed: false,
      reason: "distribution_in_progress",
    });
  });

  it("requires the parent pool to be live", () => {
    expect(evaluateCycleCreation([cycle("trading")], false)).toEqual({
      allowed: false,
      reason: "pool_not_live",
    });
  });
});
