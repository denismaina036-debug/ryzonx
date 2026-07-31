import { describe, expect, it } from "vitest";
import {
  friendlyStatSaveError,
  normalizePoolManagerStatPatch,
  normalizePoolManagerStatValue,
} from "@/domain/pool-manager/stat-validation";

describe("normalizePoolManagerStatValue", () => {
  it("rounds rating fields to one decimal within 0-5", () => {
    expect(normalizePoolManagerStatValue("ryvonxRating", 4.67)).toBe(4.7);
    expect(normalizePoolManagerStatValue("securityRating", 3)).toBe(3);
  });

  it("rejects ratings above 5 before database overflow", () => {
    expect(() => normalizePoolManagerStatValue("securityRating", 98)).toThrow(
      /Security Rating \(0–5\) must be at most 5/
    );
  });

  it("rejects monthly return values above column precision", () => {
    expect(() => normalizePoolManagerStatValue("avgMonthlyReturnPct", 70_000_000)).toThrow(
      /Average Monthly Return/
    );
  });

  it("normalizes integer display counts", () => {
    expect(normalizePoolManagerStatValue("displayInvestorCount", 500.8)).toBe(501);
  });
});

describe("normalizePoolManagerStatPatch", () => {
  it("normalizes multiple fields in a patch", () => {
    expect(
      normalizePoolManagerStatPatch({
        ryvonxRating: 4.55,
        displayTradeCount: 30.2,
      })
    ).toEqual({
      ryvonxRating: 4.6,
      displayTradeCount: 30,
    });
  });
});

describe("friendlyStatSaveError", () => {
  it("maps database overflow errors to a helpful message", () => {
    expect(friendlyStatSaveError(new Error("numeric field overflow"))).toMatch(
      /allowed range/i
    );
  });
});
