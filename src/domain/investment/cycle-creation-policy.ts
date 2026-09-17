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

/** Cycles are independent investor groups; another cycle never blocks creation. */
export function evaluateCycleCreation(
  _cycles: readonly CycleCreationState[],
  isPoolLive: boolean
): CycleCreationDecision {
  if (!isPoolLive) return { allowed: false, reason: "pool_not_live" };

  return { allowed: true, reason: null };
}
