import type { InvestmentAllocationStatus } from "@/constants/investment-allocation";
import type { InvestmentCycle } from "@/domain/investment/types";
import { resolvePublicDisplayCount } from "@/features/marketplace/utils/marketplace-pool-card-presentation";

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

/** Statuses that count toward displayed Raised Capital (all funded commitments). */
export const RAISED_CAPITAL_ALLOCATION_STATUSES: InvestmentAllocationStatus[] = [
  "pending",
  "funding_confirmed",
  "confirmed",
  "settled",
  "locked",
  "distributed",
];

/** Statuses that reserve cycle capacity (includes pending commitments). */
export const COMMITTED_ALLOCATION_STATUSES: InvestmentAllocationStatus[] = [
  "pending",
  "funding_confirmed",
  "confirmed",
  "settled",
  "locked",
  "distributed",
];

export function computeRemainingCapital(
  targetCapital: number | null | undefined,
  raisedCapital: number
): number | null {
  if (targetCapital == null || targetCapital <= 0) return null;
  return Math.max(0, targetCapital - raisedCapital);
}

export function computeFundingProgressPct(
  targetCapital: number | null | undefined,
  raisedCapital: number
): number | null {
  if (targetCapital == null || targetCapital <= 0) return null;
  return Math.min(100, Math.round((raisedCapital / targetCapital) * 1000) / 10);
}

export function computeInvestorOwnershipShare(
  investmentAmount: number,
  targetCapital: number | null | undefined
): number | null {
  if (targetCapital == null || targetCapital <= 0 || investmentAmount <= 0) return null;
  return Math.round((investmentAmount / targetCapital) * 10000) / 100;
}

export function applyCycleFundingMetrics(
  cycle: InvestmentCycle,
  liveRaisedCapital: number
): InvestmentCycle {
  return {
    ...cycle,
    raisedCapital: liveRaisedCapital,
    remainingCapital: computeRemainingCapital(cycle.targetCapital, liveRaisedCapital),
    fundingProgressPct: computeFundingProgressPct(cycle.targetCapital, liveRaisedCapital),
  };
}

/**
 * Raised capital shown for a pool. When an investment cycle is active, only the
 * cycle total is used — legacy display seeds must not inflate funding progress.
 */
export function resolvePoolLiveRaisedCapital(input: {
  hasActiveCycle?: boolean;
  cycleRaisedCapital?: number | null;
  portfolioInvestedTotal?: number;
  investorCapital?: number | null;
  currentCapital?: number | null;
  displayRaisedCapital?: number | null;
  poolStatsValue?: number | null;
  fundPoolValue?: number | null;
}): number {
  if (input.hasActiveCycle) {
    return Math.max(0, input.cycleRaisedCapital ?? 0);
  }

  const liveRaised = Math.max(
    input.portfolioInvestedTotal ?? 0,
    toNumber(input.investorCapital),
    toNumber(input.currentCapital)
  );

  const seedRaised = toNumber(input.displayRaisedCapital);
  if (seedRaised > 0 || liveRaised > 0) {
    return resolvePublicDisplayCount(seedRaised, liveRaised);
  }

  return toNumber(input.poolStatsValue) || toNumber(input.fundPoolValue);
}
