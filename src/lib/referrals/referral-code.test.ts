import { describe, expect, it } from "vitest";
import { buildReferralLink, normalizeReferralCode, referralCodeForUser } from "./referral-code";

describe("referral codes", () => {
  it("normalizes shareable codes", () => {
    expect(normalizeReferralCode(" rx-abc12345 ")).toBe("RX-ABC12345");
  });

  it("rejects missing and clearly invalid codes", () => {
    expect(normalizeReferralCode(null)).toBeNull();
    expect(normalizeReferralCode("short")).toBeNull();
    expect(normalizeReferralCode("RX-%WILDCARD")).toBeNull();
  });

  it("creates the same stable code used by the database trigger", () => {
    expect(referralCodeForUser("12345678-1234-4321-9999-1234567890ab")).toBe(
      "RX-123456781234432199991234567890AB"
    );
  });

  it("builds a registration link without duplicate slashes", () => {
    expect(buildReferralLink("RX-ABC12345", "https://ryvonx.com/")).toBe(
      "https://ryvonx.com/register?ref=RX-ABC12345"
    );
  });
});
