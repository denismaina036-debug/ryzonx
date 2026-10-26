import { describe, expect, it } from "vitest";
import { dedupeCycleProfitActivities } from "./cycle-profit-activity";

describe("dedupeCycleProfitActivities", () => {
  it("keeps the earliest projection row for an allocation", () => {
    const rows = [
      { id: "later", payment_method: "cycle_profit", created_at: "2026-10-21T02:00:00Z", metadata: { allocationId: "a1" } },
      { id: "first", payment_method: "cycle_profit", created_at: "2026-10-21T01:00:00Z", metadata: { allocationId: "a1" } },
    ];
    expect(dedupeCycleProfitActivities(rows).map((row) => row.id)).toEqual(["first"]);
  });

  it("preserves unrelated and untraceable historical rows", () => {
    const rows = [
      { id: "loss", payment_method: "cycle_loss", created_at: "2026-10-21T01:00:00Z", metadata: { allocationId: "a1" } },
      { id: "legacy", payment_method: "cycle_profit", created_at: "2026-10-21T01:00:00Z", metadata: {} },
    ];
    expect(dedupeCycleProfitActivities(rows)).toEqual(rows);
  });

  it("projects one canonical event from the 295-row production shape", () => {
    const rows = Array.from({ length: 295 }, (_, index) => ({
      id: String(index).padStart(3, "0"),
      payment_method: "cycle_profit",
      created_at: `2026-10-${String((index % 28) + 1).padStart(2, "0")}T01:00:00Z`,
      metadata: { allocationId: "5000af5a-7f36-48a4-8261-4d8c017478d2" },
      amount: 222,
    }));
    const projected = dedupeCycleProfitActivities(rows);
    expect(projected).toHaveLength(1);
    expect(projected[0]?.amount).toBe(222);
  });
});
