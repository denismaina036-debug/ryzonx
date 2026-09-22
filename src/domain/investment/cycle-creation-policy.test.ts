import { describe, expect, it } from "vitest";
import { INVESTMENT_CYCLE_STATUSES } from "@/constants/investment-cycle";
import { evaluateCycleCreation, type CycleCreationState } from "./cycle-creation-policy";

describe("independent cycle creation", () => {
  it.each(INVESTMENT_CYCLE_STATUSES)("allows another cycle while a sibling is %s", (status) => {
    const existing: CycleCreationState[] = [{ cycleNumber: 1, status, raisedCapital: 100, maxCapacity: 10000 }];
    const before = structuredClone(existing);
    expect(evaluateCycleCreation(existing, true)).toEqual({ allowed: true, reason: null });
    expect(existing).toEqual(before);
  });

  it("allows a later prepared cycle while another cycle is funding", () => {
    const cycles: CycleCreationState[] = ["funding", "trading", "distribution"].map((status, i) => ({
      cycleNumber: i + 1, status: status as CycleCreationState["status"], raisedCapital: 100, maxCapacity: null,
    }));
    expect(evaluateCycleCreation(cycles, true).allowed).toBe(true);
    expect(evaluateCycleCreation(cycles, false)).toEqual({ allowed: false, reason: "pool_not_live" });
  });
});
