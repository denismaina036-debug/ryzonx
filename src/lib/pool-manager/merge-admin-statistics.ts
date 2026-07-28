import type { PoolManagerAdminStatistics } from "@/domain/pool-manager/admin-statistics";

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
    assetsUnderManagement: pick(
      adminStats.assetsUnderManagement,
      live.assetsUnderManagement as number | null | undefined
    ),
    totalCapitalManaged: pick(
      adminStats.totalCapitalManaged,
      live.totalCapitalManaged as number | null | undefined
    ),
    activeInvestors: pick(
      adminStats.activeInvestors,
      live.activeInvestors as number | null | undefined
    ),
    displayReviewCount: pick(
      adminStats.displayReviewCount,
      live.displayReviewCount as number | null | undefined
    ),
    displayTradeCount: pick(
      adminStats.displayTradeCount,
      live.displayTradeCount as number | null | undefined
    ),
    displayInvestorCount: pick(
      adminStats.displayInvestorCount,
      live.displayInvestorCount as number | null | undefined
    ),
    successfulCycles: adminStats.successfulCycles ?? null,
    followers: adminStats.followers ?? null,
    averageTradeDurationHours: adminStats.averageTradeDurationHours ?? null,
    safetyRating: adminStats.safetyRating ?? null,
    performanceRating: adminStats.performanceRating ?? null,
    consistencyScore: adminStats.consistencyScore ?? null,
    experienceYears: adminStats.experienceYears ?? null,
    successRatio: adminStats.successRatio ?? null,
    totalProfits: adminStats.totalProfits ?? null,
    riskRating: adminStats.riskRating ?? null,
  };
}

export function formatPoolSecurityDisplay(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  return trimmed;
}
