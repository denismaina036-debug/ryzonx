import type { InvestmentCycle } from "@/domain/investment/types";
import type { InvestmentCycleStatus } from "@/constants/investment-cycle";

const ACTIVE_CYCLE_PRIORITY: InvestmentCycleStatus[] = [
  "funding",
  "trading",
  "distribution",
  "approved",
  "submitted",
  "draft",
];

/** Most relevant cycle for pool manager actions (current fundraising/trading period). */
export function resolveActivePoolCycle(cycles: InvestmentCycle[]): InvestmentCycle | null {
  if (cycles.length === 0) return null;
  for (const status of ACTIVE_CYCLE_PRIORITY) {
    const match = [...cycles].reverse().find((cycle) => cycle.status === status);
    if (match) return match;
  }
  return cycles[cycles.length - 1] ?? null;
}

export function canStartTrading(
  cycle: InvestmentCycle | null,
  siblingCycles: readonly InvestmentCycle[] = []
): boolean {
  if (cycle == null || (cycle.status !== "approved" && cycle.status !== "funding")) {
    return false;
  }

  return !siblingCycles.some(
    (sibling) =>
      sibling.id !== cycle.id &&
      (sibling.status === "trading" || sibling.status === "distribution")
  );
}

export function canOpenJournal(cycle: InvestmentCycle | null): boolean {
  return (
    cycle != null &&
    ["trading", "distribution", "completed", "archived"].includes(cycle.status)
  );
}
