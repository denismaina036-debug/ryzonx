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

export {
  formatFundingPeriodCountdown,
  formatTimeUntilTradingStart,
  resolveFundingPeriodEnd,
  resolveTradingStartDate,
} from "@/features/marketplace/utils/funding-countdown";
