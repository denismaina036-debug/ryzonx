import type { PoolManagerAdminStatistics } from "@/domain/pool-manager/admin-statistics";
import { resolvePublicDisplayCount } from "@/features/marketplace/utils/marketplace-pool-card-presentation";

/** Years since manager account was created (platform tenure). */
export function computeLiveYearsOnRyvonX(createdAt: string | Date): number {
  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const years = (Date.now() - created.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return Math.max(0, Math.round(years * 10) / 10);
}

export function readAdminYearsOnRyvonX(
  adminStats: PoolManagerAdminStatistics | null | undefined
): number | null {
  if (!adminStats) return null;
  const value = adminStats.yearsOnRyvonX ?? adminStats.experienceYears;
  if (value == null || !Number.isFinite(value)) return null;
  return value;
}

/** Admin seed as baseline; live platform tenure can exceed the seed. */
export function resolveYearsOnRyvonX(
  liveYears: number,
  adminStats: PoolManagerAdminStatistics | null | undefined
): number {
  const seed = readAdminYearsOnRyvonX(adminStats);
  if (seed == null) return liveYears;
  return resolvePublicDisplayCount(seed, liveYears);
}

/** Admin seed as baseline; live capital can exceed the seed. */
export function resolvePublicCapital(
  liveCapital: number,
  adminStats: PoolManagerAdminStatistics | null | undefined
): number {
  const seed = adminStats?.assetsUnderManagement;
  if (seed == null || !Number.isFinite(seed)) return liveCapital;
  return resolvePublicDisplayCount(seed, liveCapital);
}

/** Drawdown is always shown as a negative percentage on public surfaces. */
export function formatDrawdownPct(value: number | null | undefined, decimals = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const magnitude = Math.abs(value);
  return `-${magnitude.toFixed(decimals)}%`;
}
