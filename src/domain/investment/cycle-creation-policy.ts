import type { InvestmentCycleStatus } from "@/constants/investment-cycle";

export interface CycleCreationState {
  cycleNumber: number;
  status: InvestmentCycleStatus;
  raisedCapital: number;
  maxCapacity: number | null;
}

export type CycleCreationBlockReason = "pool_not_live";

export interface CycleCreationDecision {
  allowed: boolean;
  reason: CycleCreationBlockReason | null;
}

/**
 * A manager may prepare a later cycle while another one is funding or trading.
 * New cycles are drafts; the service transition into `funding` is the single
 * enforcement point for the one-open-funding-cycle rule.
 */
export function evaluateCycleCreation(
  _cycles: readonly CycleCreationState[],
  isPoolLive: boolean
): CycleCreationDecision {
  if (!isPoolLive) return { allowed: false, reason: "pool_not_live" };

  return { allowed: true, reason: null };
}
