import { describe, expect, it } from "vitest";
import {
  calculateCapitalAfterLoss,
  getCycleLossCapacityError,
} from "@/domain/investment/cycle-loss-policy";

describe("cycle loss policy", () => {
  it("reduces only the affected cycle capital", () => {
    expect(calculateCapitalAfterLoss(500, 200)).toBe(300);
  });

  it("allows a loss up to the full invested capital", () => {
    expect(
      getCycleLossCapacityError({
        capital: 500,
        recordedLoss: 500,
        resultingCyclePnl: -500,
      })
    ).toBeNull();
  });

  it("rejects a single loss larger than invested capital", () => {
    expect(
      getCycleLossCapacityError({
        capital: 500,
        recordedLoss: 500.01,
        resultingCyclePnl: -100,
      })
    ).toBe("A recorded loss cannot exceed the cycle's invested capital.");
  });

  it("rejects cumulative cycle losses larger than invested capital", () => {
    expect(
      getCycleLossCapacityError({
        capital: 500,
        recordedLoss: 200,
        resultingCyclePnl: -500.01,
      })
    ).toBe("The cycle's total loss cannot exceed its invested capital.");
  });
});
