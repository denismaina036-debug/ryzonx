import { describe, expect, it } from "vitest";
import {
  DEFAULT_PM_ADMISSION_TIERS,
  admissionTierFee,
  snapshotAdmissionTier,
} from "./admission-tier";

describe("Pool Manager admission tiers", () => {
  it("uses the confirmed Advanced and Elite capital ceilings", () => {
    expect(DEFAULT_PM_ADMISSION_TIERS.find((tier) => tier.slug === "advanced")?.maxCapital).toBe(100_000);
    expect(DEFAULT_PM_ADMISSION_TIERS.find((tier) => tier.slug === "elite")?.maxCapital).toBe(1_000_000);
  });

  it("prices Instant Access above the one-phase Challenge for every tier", () => {
    for (const tier of DEFAULT_PM_ADMISSION_TIERS) {
      expect(admissionTierFee(tier, "direct_access")).toBe(tier.instantAccessFee);
      expect(admissionTierFee(tier, "trading_challenge")).toBe(tier.challengeFee);
      expect(tier.instantAccessFee).toBeGreaterThanOrEqual(tier.challengeFee);
    }
  });

  it("snapshots price and capital so later admin changes cannot alter an application", () => {
    const tier = { ...DEFAULT_PM_ADMISSION_TIERS[2]! };
    const snapshot = snapshotAdmissionTier(tier, "trading_challenge");
    tier.challengeFee = 999;
    tier.maxCapital = 999;

    expect(snapshot.fee).toBe(200);
    expect(snapshot.maxCapital).toBe(100_000);
    expect(snapshot.admissionPath).toBe("trading_challenge");
  });
});
