import { describe, expect, it } from "vitest";
import type { MarketplaceManagerCard } from "@/domain/marketplace/types";
import { rankFeaturedLandingPoolManagers } from "@/lib/landing-page/featured-manager-ranking";

function buildManager(
  overrides: Partial<MarketplaceManagerCard> & Pick<MarketplaceManagerCard, "id">
): MarketplaceManagerCard {
  return {
    id: overrides.id,
    slug: overrides.slug ?? overrides.id,
    displayName: overrides.displayName ?? "Manager",
    photoUrl: overrides.photoUrl ?? null,
    country: overrides.country ?? null,
    isVerified: overrides.isVerified ?? true,
    managerLevel: overrides.managerLevel ?? null,
    tradingStyle: overrides.tradingStyle ?? "swing",
    bio: overrides.bio ?? null,
    ryvonxRating: overrides.ryvonxRating ?? null,
    securityRating: overrides.securityRating ?? null,
    aggressivenessLevel: overrides.aggressivenessLevel ?? null,
    winRatePct: overrides.winRatePct ?? null,
    avgMonthlyReturnPct: overrides.avgMonthlyReturnPct ?? null,
    maxDrawdownPct: overrides.maxDrawdownPct ?? null,
    yearsOnRyvonX: overrides.yearsOnRyvonX ?? null,
    assetsUnderManagement: overrides.assetsUnderManagement ?? 0,
    activeInvestors: overrides.activeInvestors ?? 0,
    poolsManaged: overrides.poolsManaged ?? 1,
    activeOpportunities: overrides.activeOpportunities ?? [],
    featuredOpportunity: overrides.featuredOpportunity ?? null,
  };
}

describe("rankFeaturedLandingPoolManagers", () => {
  it("returns top 5 managers using weighted composite score", () => {
    const managers = [
      buildManager({
        id: "low",
        ryvonxRating: 3,
        assetsUnderManagement: 1000,
        activeInvestors: 2,
        winRatePct: 40,
        featuredOpportunity: {
          slug: "low-pool",
          name: "Low Pool",
          displayPoolName: "Low Pool",
          strategyTag: "Scalping",
        } as never,
      }),
      buildManager({
        id: "high",
        ryvonxRating: 5,
        assetsUnderManagement: 500000,
        activeInvestors: 120,
        winRatePct: 72,
        featuredOpportunity: {
          slug: "high-pool",
          name: "High Pool",
          displayPoolName: "High Pool",
          strategyTag: "Swing",
        } as never,
      }),
      buildManager({
        id: "mid",
        ryvonxRating: 4.2,
        assetsUnderManagement: 120000,
        activeInvestors: 45,
        winRatePct: 61,
        featuredOpportunity: {
          slug: "mid-pool",
          name: "Mid Pool",
          displayPoolName: "Mid Pool",
          strategyTag: "Day Trading",
        } as never,
      }),
    ];

    const ranked = rankFeaturedLandingPoolManagers(managers, 5);

    expect(ranked[0]?.id).toBe("high");
    expect(ranked[0]?.poolName).toBe("High Pool");
    expect(ranked.length).toBeLessThanOrEqual(5);
  });

  it("respects the limit parameter", () => {
    const managers = Array.from({ length: 8 }, (_, index) =>
      buildManager({
        id: `m-${index}`,
        ryvonxRating: index,
        assetsUnderManagement: index * 10000,
        activeInvestors: index,
        winRatePct: 40 + index,
      })
    );

    expect(rankFeaturedLandingPoolManagers(managers, 5)).toHaveLength(5);
  });
});
