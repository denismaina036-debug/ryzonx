import type { PoolManagerAdminStatistics } from "@/domain/pool-manager/admin-statistics";
import type { PoolManagerLivePerformanceStatistics } from "@/domain/pool-manager/live-performance-statistics";
import { poolManagerPerformanceStatsService } from "@/services/pool-manager-performance-stats.service";

export function normalizeAdminStatistics(
  raw: PoolManagerAdminStatistics | Record<string, unknown> | null | undefined
): PoolManagerAdminStatistics | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const stats = raw as PoolManagerAdminStatistics;
  return {
    ...stats,
    yearsOnRyvonX: stats.yearsOnRyvonX ?? stats.experienceYears ?? null,
    displayInvestorCount:
      stats.displayInvestorCount ?? stats.activeInvestors ?? null,
  };
}

export async function resolveManagerPlatformPerformance(
  managerId: string,
  adminStats: PoolManagerAdminStatistics | null
): Promise<PoolManagerLivePerformanceStatistics | null> {
  if (adminStats?.livePerformance) {
    return adminStats.livePerformance;
  }

  try {
    return await poolManagerPerformanceStatsService.computeForManager(managerId);
  } catch {
    return null;
  }
}

export function attachManagerLivePerformance(
  adminStats: PoolManagerAdminStatistics | null,
  platformLive: PoolManagerLivePerformanceStatistics | null
): PoolManagerAdminStatistics | null {
  if (!adminStats && !platformLive) return null;

  return {
    ...(adminStats ?? {}),
    livePerformance: platformLive,
  };
}

/** Platform-only counters for mergeAdminStatistics (not pre-merged with admin seeds). */
export function buildManagerMergeLiveInput(input: {
  platformLive: PoolManagerLivePerformanceStatistics | null;
  liveAum: number;
  liveInvestors: number;
  liveReviewCount: number;
  liveYears: number;
  poolsManaged: number;
  ryvonxRating?: number | null;
  securityRating?: number | null;
  aggressivenessRating?: number | null;
  avgMonthlyReturnPct?: number | null;
  maxDrawdownPct?: number | null;
  winRatePct?: number | null;
}) {
  const platformTradeCount = input.platformLive?.closedTrades ?? 0;

  return {
    ryvonxRating: input.ryvonxRating ?? null,
    securityRating: input.securityRating ?? null,
    aggressivenessRating: input.aggressivenessRating ?? null,
    winRatePct: input.winRatePct ?? null,
    avgMonthlyReturnPct: input.avgMonthlyReturnPct ?? null,
    maxDrawdownPct: input.maxDrawdownPct ?? null,
    assetsUnderManagement: input.liveAum,
    activeInvestors: input.liveInvestors,
    publicReviewCount: input.liveReviewCount,
    publicTradeCount: platformTradeCount,
    displayTradeCount: platformTradeCount,
    yearsOnRyvonX: input.liveYears,
    poolsManaged: input.poolsManaged,
  };
}
