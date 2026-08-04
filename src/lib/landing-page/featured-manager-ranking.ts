import type { MarketplaceManagerCard } from "@/domain/marketplace/types";
import type { FeaturedLandingPoolManager } from "@/domain/landing-page/types";
import { resolveMarketplacePoolAum } from "@/features/marketplace/utils/marketplace-pool-card-presentation";

const WEIGHTS = {
  rating: 0.4,
  capital: 0.3,
  investors: 0.2,
  consistency: 0.1,
} as const;

function normalizeValues(values: number[]): (value: number) => number {
  if (values.length === 0) return () => 0;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return (value) => (value - min) / range;
}

function pickFeaturedPool(manager: MarketplaceManagerCard) {
  return (
    manager.featuredOpportunity ??
    manager.activeOpportunities.find((pool) => pool.poolVerified) ??
    manager.activeOpportunities[0] ??
    null
  );
}

function resolveManagerCapitalManaged(
  manager: MarketplaceManagerCard,
  featuredPool: MarketplaceManagerCard["featuredOpportunity"]
): number {
  if (manager.assetsUnderManagement > 0) return manager.assetsUnderManagement;
  if (featuredPool) {
    const featuredAum = resolveMarketplacePoolAum(featuredPool);
    if (featuredAum > 0) return featuredAum;
  }
  return manager.activeOpportunities.reduce(
    (sum, pool) => sum + resolveMarketplacePoolAum(pool),
    0
  );
}

export function rankFeaturedLandingPoolManagers(
  managers: MarketplaceManagerCard[],
  limit = 5
): FeaturedLandingPoolManager[] {
  if (managers.length === 0) return [];

  const ratings = managers.map((manager) => manager.ryvonxRating ?? 0);
  const capitals = managers.map((manager) =>
    resolveManagerCapitalManaged(manager, pickFeaturedPool(manager))
  );
  const investors = managers.map((manager) => manager.activeInvestors);
  const consistencies = managers.map((manager) => manager.winRatePct ?? 0);

  const normalizeRating = normalizeValues(ratings);
  const normalizeCapital = normalizeValues(capitals);
  const normalizeInvestors = normalizeValues(investors);
  const normalizeConsistency = normalizeValues(consistencies);

  const ranked = managers
    .map((manager, index) => {
      const compositeScore =
        WEIGHTS.rating * normalizeRating(ratings[index] ?? 0) +
        WEIGHTS.capital * normalizeCapital(capitals[index] ?? 0) +
        WEIGHTS.investors * normalizeInvestors(investors[index] ?? 0) +
        WEIGHTS.consistency * normalizeConsistency(consistencies[index] ?? 0);

      const pool = pickFeaturedPool(manager);

      return {
        id: manager.id,
        slug: manager.slug,
        displayName: manager.displayName,
        photoUrl: manager.photoUrl,
        isVerified: manager.isVerified,
        poolName: pool?.displayPoolName ?? pool?.name ?? manager.displayName,
        strategy: pool?.strategyTag ?? pool?.tradingStyleTag ?? manager.tradingStyle,
        capitalManaged: resolveManagerCapitalManaged(manager, pool),
        investorCount: manager.activeInvestors,
        winRatePct: manager.winRatePct,
        rating: manager.ryvonxRating,
        poolSlug: pool?.slug ?? null,
        compositeScore,
      } satisfies FeaturedLandingPoolManager;
    })
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .slice(0, limit);

  return ranked;
}
