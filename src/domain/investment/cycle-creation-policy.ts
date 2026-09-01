import type { InvestmentCycleStatus } from "@/constants/investment-cycle";

export interface CycleCreationState {
  cycleNumber: number;
  status: InvestmentCycleStatus;
  raisedCapital: number;
  maxCapacity: number | null;
}

export type CycleCreationBlockReason =
  | "pool_not_live"
  | "funding_cycle_open"
  | "cycle_transition_pending"
  | "distribution_in_progress";

export interface CycleCreationDecision {
  allowed: boolean;
  reason: CycleCreationBlockReason | null;
}

function latestCycle(cycles: readonly CycleCreationState[]): CycleCreationState | null {
  return cycles.reduce<CycleCreationState | null>(
    (latest, cycle) =>
      latest == null || cycle.cycleNumber > latest.cycleNumber ? cycle : latest,
    null
  );
}

/**
 * A pool may raise its next cycle while the preceding cycle is trading.
 * The existing full-funding and completed-cycle paths remain unchanged.
 */
export function evaluateCycleCreation(
  cycles: readonly CycleCreationState[],
  isPoolLive: boolean
): CycleCreationDecision {
  if (!isPoolLive) return { allowed: false, reason: "pool_not_live" };

  const current = latestCycle(cycles);
  if (!current) return { allowed: true, reason: null };

  if (["completed", "archived", "trading"].includes(current.status)) {
    return { allowed: true, reason: null };
  }

  if (current.status === "funding") {
    const isFull =
      current.maxCapacity != null &&
      current.maxCapacity > 0 &&
      current.raisedCapital >= current.maxCapacity;
    return isFull
      ? { allowed: true, reason: null }
      : { allowed: false, reason: "funding_cycle_open" };
  }

  if (current.status === "distribution") {
    return { allowed: false, reason: "distribution_in_progress" };
  }

  return { allowed: false, reason: "cycle_transition_pending" };
}
