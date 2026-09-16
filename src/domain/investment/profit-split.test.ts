import { describe, expect, it } from "vitest";
import {
  defaultCycleProfitSplits,
  formatCycleProfitSplit,
  validateCycleProfitSplits,
} from "./profit-split";
import {
  applyCycleSnapshotOverrides,
  buildPoolConfigSnapshot,
  readCycleProfitSplit,
} from "@/domain/pools/pool-config-snapshot";

describe("display-only cycle profit splits", () => {
  const levelIds = ["starter", "growth"];

  it("creates a neutral split for every copy tier", () => {
    expect(defaultCycleProfitSplits(levelIds.map((id) => ({ id })))).toEqual([
      { investmentLevelId: "starter", traderPct: 50, copierPct: 50 },
      { investmentLevelId: "growth", traderPct: 50, copierPct: 50 },
    ]);
  });

  it("accepts one complete 100 percent split per active tier", () => {
    expect(
      validateCycleProfitSplits(
        [
          { investmentLevelId: "starter", traderPct: 30, copierPct: 70 },
          { investmentLevelId: "growth", traderPct: 20, copierPct: 80 },
        ],
        levelIds
      )
    ).toBeNull();
  });

  it("rejects incomplete, duplicate, unknown, and invalid splits", () => {
    expect(
      validateCycleProfitSplits(
        [{ investmentLevelId: "starter", traderPct: 30, copierPct: 70 }],
        levelIds
      )
    ).toMatch(/every active copy tier/i);
    expect(
      validateCycleProfitSplits(
        [
          { investmentLevelId: "starter", traderPct: 30, copierPct: 70 },
          { investmentLevelId: "starter", traderPct: 40, copierPct: 60 },
        ],
        levelIds
      )
    ).toMatch(/one profit split/i);
    expect(
      validateCycleProfitSplits(
        [
          { investmentLevelId: "starter", traderPct: 30, copierPct: 70 },
          { investmentLevelId: "unknown", traderPct: 40, copierPct: 60 },
        ],
        levelIds
      )
    ).toMatch(/every active copy tier/i);
    expect(
      validateCycleProfitSplits(
        [
          { investmentLevelId: "starter", traderPct: 101, copierPct: -1 },
          { investmentLevelId: "growth", traderPct: 40, copierPct: 60 },
        ],
        levelIds
      )
    ).toMatch(/add up to 100/i);
  });

  it("formats the copier and trader terms without changing calculations", () => {
    expect(
      formatCycleProfitSplit({
        investmentLevelId: "growth",
        traderPct: 27.5,
        copierPct: 72.5,
      })
    ).toBe("Copier 72.5% · Trader 27.5%");
    expect(formatCycleProfitSplit(null)).toBe("Not set");
  });

  it("updates only snapshot display metadata and resolves it by copier tier", () => {
    const snapshot = buildPoolConfigSnapshot(
      { target_capital: 10000 },
      "strategy-1",
      2,
      [{ investmentLevelId: "growth", multiplier: 1.5 }]
    );
    const splits = [{ investmentLevelId: "growth", traderPct: 25, copierPct: 75 }];

    const updated = applyCycleSnapshotOverrides(snapshot, { profitSplits: splits });

    expect(updated.pool.targetCapital).toBe(10000);
    expect(updated.pool.roiMultipliers).toEqual(snapshot.pool.roiMultipliers);
    expect(readCycleProfitSplit(updated, "growth")).toEqual(splits[0]);
    expect(readCycleProfitSplit(updated, "starter")).toBeNull();
  });
});
