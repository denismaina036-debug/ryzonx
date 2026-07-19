import type { MarketplacePoolCard } from "@/domain/marketplace/types";

export interface MarketplaceHeroStats {
  livePools: number;
  activeInvestors: number;
}

export function computeMarketplaceHeroStats(input: {
  pools: MarketplacePoolCard[];
  activeInvestors: number;
}): MarketplaceHeroStats {
  return {
    livePools: input.pools.length,
    activeInvestors: input.activeInvestors,
  };
}

export function pickFeaturedSection<T extends { managers: unknown[] }>(
  sections: T[]
): T | null {
  return sections.find((s) => s.managers.length > 0) ?? null;
}
