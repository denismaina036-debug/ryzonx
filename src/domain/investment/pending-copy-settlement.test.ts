import { describe, expect, it } from "vitest";
import {
  hasRecoverableAllocationBalance,
  selectPendingCopySettlement,
} from "./pending-copy-settlement";

describe("pending copy settlement selection", () => {
  const pending = [
    { id: "old", fundId: "fund", investmentCycleId: "cycle-1" },
    { id: "current", fundId: "fund", investmentCycleId: "cycle-2" },
  ];

  it("keeps a completed-cycle balance recoverable while a newer cycle trades", () => {
    expect(selectPendingCopySettlement(pending, "fund", ["cycle-2"])?.id).toBe("current");
  });

  it("does not let fully returned source capital enter continuation", () => {
    expect(hasRecoverableAllocationBalance({ amount: 500, returnedCapitalAmount: 500 })).toBe(false);
    expect(hasRecoverableAllocationBalance({ amount: 500, returnedCapitalAmount: 0 })).toBe(true);
  });
});
