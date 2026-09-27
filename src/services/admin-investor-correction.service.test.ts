import { describe, expect, it } from "vitest";
import { selectActiveStrategyAllocations } from "@/services/admin-investor-correction.utils";

function allocation(id: string, fundId: string, name: string) {
  return {
    id,
    amount: 100,
    status: "funding_confirmed" as const,
    investment_cycle_id: `cycle-${id}`,
    investment_cycles: {
      fund_id: fundId,
      funds: { name },
    },
  };
}

describe("selectActiveStrategyAllocations", () => {
  it("shows only the newest allocation for strategies the investor is still copying", () => {
    const allocations = [
      allocation("kd-current", "kd", "K-D Trading"),
      allocation("kd-history", "kd", "K-D Trading"),
      allocation("xau-stopped", "xau", "XAU Strategy"),
    ];

    expect(selectActiveStrategyAllocations(allocations, new Set(["kd"]))).toEqual([
      allocations[0],
    ]);
  });
});
