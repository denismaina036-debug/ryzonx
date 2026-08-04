import { describe, expect, it } from "vitest";
import { resolveMarketplacePoolAum } from "@/features/marketplace/utils/marketplace-pool-card-presentation";

describe("resolveMarketplacePoolAum", () => {
  it("prefers raised capital when assets_under_management is zero", () => {
    expect(
      resolveMarketplacePoolAum({
        assetsUnderManagement: 0,
        raisedCapital: 1_250_000,
        investorCapital: 500_000,
        ryvonxCapital: 0,
      })
    ).toBe(1_250_000);
  });

  it("falls back to investor plus ryvonx capital", () => {
    expect(
      resolveMarketplacePoolAum({
        assetsUnderManagement: 0,
        raisedCapital: 0,
        investorCapital: 800_000,
        ryvonxCapital: 200_000,
      })
    ).toBe(1_000_000);
  });
});
