import type { PoolManagerAdminStatistics } from "@/domain/pool-manager/admin-statistics";
import {
  resolvePublicCapital,
  resolveYearsOnRyvonX,
} from "@/lib/pool-manager/public-statistics";
import { resolvePublicDisplayCount } from "@/features/marketplace/utils/marketplace-pool-card-presentation";

function pick<T>(override: T | null | undefined, live: T | null | undefined): T | null {
  if (override !== undefined && override !== null) return override;
  return live ?? null;
}

/** Merge admin overrides with live manager metrics for public display. */
export function mergeAdminStatistics<T extends Record<string, unknown>>(
  live: T,
  adminStats: PoolManagerAdminStatistics | null | undefined
): T & PoolManagerAdminStatistics {
  if (!adminStats || Object.keys(adminStats).length === 0) {
    return live as T & PoolManagerAdminStatistics;
  }

  const liveAum = live.assetsUnderManagement as number | null | undefined;
  const liveYears = live.yearsOnRyvonX as number | null | undefined;
  const liveInvestors = live.activeInvestors as number | null | undefined;
  const liveReviewCount =
    (live.publicReviewCount as number | null | undefined) ??
    (live.displayReviewCount as number | null | undefined);
  const liveTradeCount =
    (live.publicTradeCount as number | null | undefined) ??
    (live.displayTradeCount as number | null | undefined);

  const investorSeed =
    adminStats.displayInvestorCount ?? adminStats.activeInvestors ?? null;
  const reviewSeed = adminStats.displayReviewCount ?? null;
  const tradeSeed = adminStats.displayTradeCount ?? null;

  return {
    ...live,
    winRatePct: pick(adminStats.winRatePct, live.winRatePct as number | null | undefined),
    avgMonthlyReturnPct: pick(
      adminStats.avgMonthlyReturnPct,
      live.avgMonthlyReturnPct as number | null | undefined
    ),
    maxDrawdownPct: pick(
      adminStats.maxDrawdownPct,
      live.maxDrawdownPct as number | null | undefined
    ),
    ryvonxRating: pick(adminStats.ryvonxRating, live.ryvonxRating as number | null | undefined),
    securityRating: pick(
      adminStats.securityRating,
      live.securityRating as number | null | undefined
    ),
    aggressivenessRating: pick(
      adminStats.aggressivenessRating,
      live.aggressivenessRating as number | null | undefined
    ),
    assetsUnderManagement:
      liveAum != null
        ? resolvePublicCapital(liveAum, adminStats)
        : pick(adminStats.assetsUnderManagement, liveAum),
    totalCapitalManaged: pick(
      adminStats.totalCapitalManaged,
      live.totalCapitalManaged as number | null | undefined
    ),
    activeInvestors:
      liveInvestors != null && investorSeed != null
        ? resolvePublicDisplayCount(investorSeed, liveInvestors)
        : pick(investorSeed, liveInvestors),
    displayReviewCount:
      liveReviewCount != null && reviewSeed != null
        ? resolvePublicDisplayCount(reviewSeed, liveReviewCount)
        : pick(reviewSeed, liveReviewCount),
    displayTradeCount:
      liveTradeCount != null && tradeSeed != null
        ? resolvePublicDisplayCount(tradeSeed, liveTradeCount)
        : pick(tradeSeed, liveTradeCount),
    displayInvestorCount: investorSeed,
    yearsOnRyvonX:
      liveYears != null
        ? resolveYearsOnRyvonX(liveYears, adminStats)
        : readAdminYearsOnRyvonX(adminStats),
    successfulCycles: adminStats.successfulCycles ?? null,
    followers: adminStats.followers ?? null,
    averageTradeDurationHours: adminStats.averageTradeDurationHours ?? null,
    safetyRating: adminStats.safetyRating ?? null,
    performanceRating: adminStats.performanceRating ?? null,
    consistencyScore: adminStats.consistencyScore ?? null,
    successRatio: adminStats.successRatio ?? null,
    totalProfits: adminStats.totalProfits ?? null,
    riskRating: adminStats.riskRating ?? null,
  };
}

function readAdminYearsOnRyvonX(
  adminStats: PoolManagerAdminStatistics
): number | null {
  const value = adminStats.yearsOnRyvonX ?? adminStats.experienceYears;
  if (value == null || !Number.isFinite(value)) return null;
  return value;
}

export function formatPoolSecurityDisplay(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  return value.trim();
}
