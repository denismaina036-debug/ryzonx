import type { PoolManagerAdminStatistics, PoolManagerStatField } from "@/domain/pool-manager/admin-statistics";
import {
  isPerformanceStatOverridden,
  type PoolManagerLivePerformanceStatistics,
} from "@/domain/pool-manager/live-performance-statistics";
import {
  resolvePublicCapital,
  resolveYearsOnRyvonX,
} from "@/lib/pool-manager/public-statistics";
import { resolvePublicDisplayCount } from "@/features/marketplace/utils/marketplace-pool-card-presentation";
import { mergeLivePerformanceWithAdminBaseline } from "@/lib/pool-manager/merge-live-performance-with-baseline";

function pick<T>(override: T | null | undefined, live: T | null | undefined): T | null {
  if (override !== undefined && override !== null) return override;
  return live ?? null;
}

function mapLivePerformanceToAdminFields(
  adminStats: PoolManagerAdminStatistics,
  stats: PoolManagerLivePerformanceStatistics | null | undefined
): Partial<PoolManagerAdminStatistics> {
  return mergeLivePerformanceWithAdminBaseline(adminStats, stats);
}

function resolvePerformanceStat(
  field: PoolManagerStatField,
  adminStats: PoolManagerAdminStatistics,
  liveDerived: Partial<PoolManagerAdminStatistics>,
  fallbackLive: number | null | undefined
): number | null {
  const overrides = adminStats.performanceStatOverrides ?? [];
  const hasLiveTrading = (adminStats.livePerformance?.closedTrades ?? 0) > 0;

  if (isPerformanceStatOverridden(field, overrides)) {
    const manual = adminStats[field];
    return manual == null ? fallbackLive ?? null : (manual as number);
  }

  if (hasLiveTrading) {
    const derived = liveDerived[field];
    if (derived != null) return derived as number;
  }

  return pick(adminStats[field] as number | null | undefined, fallbackLive);
}

/** Merge admin overrides with live manager metrics for public display. */
export function mergeAdminStatistics<T extends Record<string, unknown>>(
  live: T,
  adminStats: PoolManagerAdminStatistics | null | undefined
): T & PoolManagerAdminStatistics {
  if (!adminStats || Object.keys(adminStats).length === 0) {
    return live as T & PoolManagerAdminStatistics;
  }

  const liveDerived = mapLivePerformanceToAdminFields(
    adminStats,
    adminStats.livePerformance
  );
  const liveAum = live.assetsUnderManagement as number | null | undefined;
  const liveYears = live.yearsOnRyvonX as number | null | undefined;
  const liveInvestors = live.activeInvestors as number | null | undefined;
  const liveReviewCount =
    (live.publicReviewCount as number | null | undefined) ??
    (live.displayReviewCount as number | null | undefined);
  const liveTradeCount =
    (live.publicTradeCount as number | null | undefined) ??
    (live.displayTradeCount as number | null | undefined) ??
    liveDerived.displayTradeCount ??
    null;

  const investorSeed =
    adminStats.displayInvestorCount ?? adminStats.activeInvestors ?? null;
  const reviewSeed = adminStats.displayReviewCount ?? null;
  const tradeSeed = adminStats.displayTradeCount ?? null;

  return {
    ...live,
    winRatePct: resolvePerformanceStat(
      "winRatePct",
      adminStats,
      liveDerived,
      live.winRatePct as number | null | undefined
    ),
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
      liveDerived.displayTradeCount ??
      (liveTradeCount != null && tradeSeed != null
        ? resolvePublicDisplayCount(tradeSeed, liveTradeCount)
        : pick(tradeSeed, liveTradeCount)),
    displayInvestorCount: investorSeed,
    yearsOnRyvonX:
      liveYears != null
        ? resolveYearsOnRyvonX(liveYears, adminStats)
        : readAdminYearsOnRyvonX(adminStats),
    successfulCycles: resolvePerformanceStat(
      "successfulCycles",
      adminStats,
      liveDerived,
      adminStats.successfulCycles ?? null
    ),
    followers: adminStats.followers ?? null,
    averageTradeDurationHours: resolvePerformanceStat(
      "averageTradeDurationHours",
      adminStats,
      liveDerived,
      adminStats.averageTradeDurationHours ?? null
    ),
    safetyRating: adminStats.safetyRating ?? null,
    performanceRating: adminStats.performanceRating ?? null,
    consistencyScore: adminStats.consistencyScore ?? null,
    successRatio: resolvePerformanceStat(
      "successRatio",
      adminStats,
      liveDerived,
      adminStats.successRatio ?? null
    ),
    totalProfits: resolvePerformanceStat(
      "totalProfits",
      adminStats,
      liveDerived,
      adminStats.totalProfits ?? null
    ),
    riskRating: adminStats.riskRating ?? null,
    livePerformance: adminStats.livePerformance ?? null,
    performanceStatOverrides: adminStats.performanceStatOverrides ?? null,
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
