import type { InvestmentAllocationStatus } from "@/constants/investment-allocation";
import type { InvestmentCycleStatus } from "@/constants/investment-cycle";

/** Valid allocation status transitions for settlement workflow */
export const ALLOCATION_STATUS_TRANSITIONS: Partial<
  Record<InvestmentAllocationStatus, InvestmentAllocationStatus[]>
> = {
  pending: ["funding_confirmed", "cancelled", "rejected"],
  funding_confirmed: ["settled", "rejected", "cancelled"],
  confirmed: ["funding_confirmed", "locked"],
  settled: ["locked", "distributed"],
  locked: ["distributed"],
};

export function assertAllocationTransition(
  from: InvestmentAllocationStatus,
  to: InvestmentAllocationStatus
): void {
  const allowed = ALLOCATION_STATUS_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid allocation transition from ${from} to ${to}.`);
  }
}

export function assertCycleAllowsFundingConfirmation(cycleStatus: InvestmentCycleStatus): void {
  if (cycleStatus !== "funding") {
    throw new Error("Funding can only be confirmed while the cycle is in funding status.");
  }
}

export function assertCycleAllowsSettlement(cycleStatus: InvestmentCycleStatus): void {
  if (!["funding", "trading", "approved"].includes(cycleStatus)) {
    throw new Error("Settlement is not permitted for this cycle status.");
  }
}

export function assertCycleAllowsDistribution(cycleStatus: InvestmentCycleStatus): void {
  if (!["distribution", "completed", "trading"].includes(cycleStatus)) {
    throw new Error("Distribution preparation requires an operational or completing cycle.");
  }
}

export function assertPositiveAmount(amount: number, label = "Amount"): void {
  if (amount <= 0) throw new Error(`${label} must be positive.`);
}
