import {
  AGGRESSIVENESS_LABELS,
  SECURITY_RATING_LABELS,
} from "@/constants/marketplace";
import type { MarketplacePoolDetail } from "@/domain/marketplace/types";

export function formatInitialRatingScore(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return `${value.toFixed(1)} / 5`;
}

export function resolveJoinPageSecurityLabel(pool: MarketplacePoolDetail): string {
  const managerScore = formatInitialRatingScore(pool.manager?.securityRating);
  if (managerScore) return managerScore;
  if (pool.securityRating) {
    return SECURITY_RATING_LABELS[pool.securityRating] ?? pool.securityRating;
  }
  return "—";
}

export function resolveJoinPageAggressivenessLabel(pool: MarketplacePoolDetail): string {
  const managerScore = formatInitialRatingScore(pool.manager?.aggressivenessRating);
  if (managerScore) return managerScore;
  if (pool.aggressivenessLevel) {
    return AGGRESSIVENESS_LABELS[pool.aggressivenessLevel] ?? pool.aggressivenessLevel;
  }
  return "—";
}

export function resolvePoolMaximumCapital(pool: MarketplacePoolDetail): number | null {
  if (pool.targetCapital > 0) return pool.targetCapital;
  if (pool.maxAum != null && pool.maxAum > 0) return pool.maxAum;
  return null;
}

function readManagedOpeningDate(poolFaq: unknown): string | null {
  if (!poolFaq || typeof poolFaq !== "object" || Array.isArray(poolFaq)) return null;
  const managed = (poolFaq as { managedPool?: { openingDate?: string } }).managedPool;
  const value = managed?.openingDate?.trim();
  return value || null;
}

export function resolveTradingStartDate(pool: MarketplacePoolDetail): string | null {
  if (pool.tradingStartsAt) return pool.tradingStartsAt;
  const cycle = pool.activeCycle;
  if (cycle?.openingDate) return cycle.openingDate;
  if (cycle?.closingDate) return cycle.closingDate;
  if (cycle?.fundingDeadline) return cycle.fundingDeadline;
  return null;
}

export function formatTimeUntilTradingStart(pool: MarketplacePoolDetail): string | null {
  const tradingStartIso = resolveTradingStartDate(pool);
  if (!tradingStartIso) return null;

  const tradingStart = new Date(tradingStartIso);
  if (Number.isNaN(tradingStart.getTime())) return null;

  const diffMs = tradingStart.getTime() - Date.now();
  if (diffMs <= 0) {
    return pool.activeCycle?.status === "funding" || pool.activeCycle?.status === "approved"
      ? "Trading begins soon"
      : "Trading has started";
  }

  const totalMinutes = Math.ceil(diffMs / (60 * 1000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days} day${days === 1 ? "" : "s"}${hours > 0 ? ` ${hours} hr${hours === 1 ? "" : "s"}` : ""}`;
  }
  if (hours > 0) {
    return `${hours} hr${hours === 1 ? "" : "s"}${minutes > 0 ? ` ${minutes} min` : ""}`;
  }
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}
