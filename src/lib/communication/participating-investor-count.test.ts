import { describe, expect, it } from "vitest";
import { resolveCommunicatedInvestorCount } from "./participating-investor-count";

describe("resolveCommunicatedInvestorCount", () => {
  it("adds the pool's initial investors to the current cycle participants", () => {
    expect(resolveCommunicatedInvestorCount(12, 1)).toBe(13);
  });

  it("preserves the initial count when a cycle has no live investors yet", () => {
    expect(resolveCommunicatedInvestorCount(12, 0)).toBe(12);
  });

  it("safely normalizes missing, fractional, negative, and invalid values", () => {
    expect(resolveCommunicatedInvestorCount(null, undefined)).toBe(0);
    expect(resolveCommunicatedInvestorCount("12.9", "2.8")).toBe(14);
    expect(resolveCommunicatedInvestorCount(-4, "invalid")).toBe(0);
  });
});
