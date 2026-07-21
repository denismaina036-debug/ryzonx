import type { MarketplacePoolDetail } from "@/domain/marketplace/types";

export interface FundingCountdownParts {
  days: number;
  hours: number;
  minutes: number;
  expired: boolean;
}

function readManagedFundingPeriodDays(poolFaq: unknown): number | null {
  if (!poolFaq || typeof poolFaq !== "object" || Array.isArray(poolFaq)) return null;
  const days = (poolFaq as { managedPool?: { fundingPeriodDays?: number } }).managedPool
    ?.fundingPeriodDays;
  return typeof days === "number" && days > 0 ? days : null;
}

/** End of the public funding period — not the automatic trading start. */
export function resolveFundingPeriodEnd(pool: MarketplacePoolDetail): string | null {
  if (pool.fundingPeriodEndsAt) return pool.fundingPeriodEndsAt;
  const cycle = pool.activeCycle;
  if (cycle?.fundingDeadline) return cycle.fundingDeadline;
  if (cycle?.closingDate) return cycle.closingDate;
  return null;
}

export function computeFundingCountdown(endIso: string | null): FundingCountdownParts | null {
  if (!endIso) return null;
  const end = new Date(endIso);
  if (Number.isNaN(end.getTime())) return null;

  const diffMs = end.getTime() - Date.now();
  const expired = diffMs <= 0;
  const totalMinutes = Math.max(0, Math.ceil(diffMs / (60 * 1000)));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return { days, hours, minutes, expired };
}

export function formatFundingCountdownLabel(parts: FundingCountdownParts): string {
  return `${parts.days} Days ${parts.hours} Hours ${parts.minutes} Minutes`;
}

/** Public "Starts In" countdown for the remaining funding period. */
export function formatFundingPeriodCountdown(pool: MarketplacePoolDetail): string | null {
  const status = pool.activeCycle?.status;
  if (status !== "funding" && status !== "approved") return null;

  const end = resolveFundingPeriodEnd(pool);
  const parts = computeFundingCountdown(end);
  if (!parts) return null;

  return formatFundingCountdownLabel(parts);
}

/** @deprecated Use formatFundingPeriodCountdown — kept for join flow imports during migration. */
export function formatTimeUntilTradingStart(pool: MarketplacePoolDetail): string | null {
  return formatFundingPeriodCountdown(pool);
}

export function resolveTradingStartDate(pool: MarketplacePoolDetail): string | null {
  return resolveFundingPeriodEnd(pool);
}

export function readFundingPeriodDaysFromPoolFaq(poolFaq: unknown): number | null {
  return readManagedFundingPeriodDays(poolFaq);
}
