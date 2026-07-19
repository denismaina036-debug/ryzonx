import type { InvestmentCycleStatus } from "@/constants/investment-cycle";
import {
  INVESTMENT_CYCLE_ADMIN_TRANSITIONS,
  INVESTMENT_CYCLE_LIFECYCLE_ORDER,
  INVESTMENT_CYCLE_MANAGER_TRANSITIONS,
} from "@/constants/investment-cycle";

export function canTransitionInvestmentCycle(
  from: InvestmentCycleStatus,
  to: InvestmentCycleStatus,
  actor: "manager" | "admin"
): boolean {
  const map =
    actor === "admin"
      ? INVESTMENT_CYCLE_ADMIN_TRANSITIONS
      : INVESTMENT_CYCLE_MANAGER_TRANSITIONS;
  return map[from]?.includes(to) ?? false;
}

export function assertInvestmentCycleTransition(
  from: InvestmentCycleStatus,
  to: InvestmentCycleStatus,
  actor: "manager" | "admin"
): void {
  if (!canTransitionInvestmentCycle(from, to, actor)) {
    throw new Error(`Invalid investment cycle transition: ${from} → ${to}`);
  }
}

export function isInvestmentCycleEditable(status: InvestmentCycleStatus): boolean {
  return status === "draft" || status === "submitted";
}

export function lifecycleIndex(status: InvestmentCycleStatus): number {
  return INVESTMENT_CYCLE_LIFECYCLE_ORDER.indexOf(status);
}

export function isCycleAtOrAfter(
  status: InvestmentCycleStatus,
  threshold: InvestmentCycleStatus
): boolean {
  return lifecycleIndex(status) >= lifecycleIndex(threshold);
}
