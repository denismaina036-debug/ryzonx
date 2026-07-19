import type {
  MarketplaceManagerCard,
  MarketplacePoolCard,
} from "@/domain/marketplace/types";

function pickFeaturedOpportunity(pools: MarketplacePoolCard[]): MarketplacePoolCard | null {
  if (pools.length === 0) return null;
  const open = pools.filter((p) => p.capacityStatus === "open" || p.capacityStatus === "nearly_full");
  const candidates = open.length > 0 ? open : pools;
  return [...candidates].sort((a, b) => b.activeInvestors - a.activeInvestors)[0] ?? null;
}

/**
 * Groups marketplace pool cards by pool manager for presentation.
 * Pools without a manager slug are grouped under a synthetic key.
 */
export function aggregatePoolsByManager(pools: MarketplacePoolCard[]): MarketplaceManagerCard[] {
  const byManager = new Map<string, MarketplacePoolCard[]>();

  for (const pool of pools) {
    const key = pool.managerSlug ?? `__unassigned__:${pool.managerName ?? pool.id}`;
    const list = byManager.get(key) ?? [];
    list.push(pool);
    byManager.set(key, list);
  }

  const managers: MarketplaceManagerCard[] = [];

  for (const [, managerPools] of byManager) {
    const sample = managerPools[0];
    if (!sample) continue;

    const assetsUnderManagement = managerPools.reduce((s, p) => s + p.assetsUnderManagement, 0);
    const activeInvestors = managerPools.reduce((s, p) => s + p.activeInvestors, 0);
    const ratings = managerPools
      .map((p) => p.ryvonxRating)
      .filter((v): v is number => v != null);
    const avgRating =
      ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

    managers.push({
      id: sample.managerSlug ?? sample.id,
      slug: sample.managerSlug,
      displayName: sample.managerName ?? "RyvonX Manager",
      photoUrl: sample.managerPhotoUrl,
      country: null,
      isVerified: sample.managerVerified,
      managerLevel: null,
      tradingStyle: sample.tradingStyle,
      bio: sample.tagline,
      ryvonxRating: avgRating,
      securityRating: sample.securityRating,
      aggressivenessLevel: sample.aggressivenessLevel,
      winRatePct: null,
      avgMonthlyReturnPct:
        managerPools.reduce((s, p) => s + p.monthlyReturnPct, 0) / managerPools.length,
      maxDrawdownPct: sample.maxDrawdownPct,
      yearsOnRyvonX: null,
      assetsUnderManagement,
      activeInvestors,
      poolsManaged: managerPools.length,
      activeOpportunities: managerPools,
      featuredOpportunity: pickFeaturedOpportunity(managerPools),
    });
  }

  return managers;
}

export function sortManagers(
  managers: MarketplaceManagerCard[],
  sort?: string
): MarketplaceManagerCard[] {
  const items = [...managers];
  switch (sort) {
    case "highest_return":
      return items.sort((a, b) => (b.avgMonthlyReturnPct ?? 0) - (a.avgMonthlyReturnPct ?? 0));
    case "most_investors":
      return items.sort((a, b) => b.activeInvestors - a.activeInvestors);
    case "highest_aum":
      return items.sort((a, b) => b.assetsUnderManagement - a.assetsUnderManagement);
    case "most_pools":
      return items.sort((a, b) => b.poolsManaged - a.poolsManaged);
    case "newest":
      return items.sort(
        (a, b) =>
          new Date(b.featuredOpportunity?.listedAt ?? 0).getTime() -
          new Date(a.featuredOpportunity?.listedAt ?? 0).getTime()
      );
    case "best_rated":
    default:
      return items.sort((a, b) => (b.ryvonxRating ?? 0) - (a.ryvonxRating ?? 0));
  }
}

export function filterManagers(
  managers: MarketplaceManagerCard[],
  search: string
): MarketplaceManagerCard[] {
  const q = search.trim().toLowerCase();
  if (!q) return managers;

  return managers.filter(
    (m) =>
      m.displayName.toLowerCase().includes(q) ||
      (m.tradingStyle?.toLowerCase().includes(q) ?? false) ||
      m.activeOpportunities.some(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.tagline?.toLowerCase().includes(q) ?? false)
      )
  );
}
