import type { InvestmentAllocationStatus } from "@/constants/investment-allocation";
import type { InvestmentCycle } from "@/domain/investment/types";

/** Statuses that count toward displayed Raised Capital (confirmed commitments). */
export const RAISED_CAPITAL_ALLOCATION_STATUSES: InvestmentAllocationStatus[] = [
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
