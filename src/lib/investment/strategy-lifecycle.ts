import type { StrategyStatus } from "@/constants/strategy";
import {
  STRATEGY_ADMIN_TRANSITIONS,
  STRATEGY_MANAGER_TRANSITIONS,
} from "@/constants/strategy";

export function canTransitionStrategy(
  from: StrategyStatus,
  to: StrategyStatus,
  actor: "manager" | "admin"
): boolean {
  const map =
    actor === "admin" ? STRATEGY_ADMIN_TRANSITIONS : STRATEGY_MANAGER_TRANSITIONS;
  return map[from]?.includes(to) ?? false;
}

export function assertStrategyTransition(
  from: StrategyStatus,
  to: StrategyStatus,
  actor: "manager" | "admin"
): void {
  if (!canTransitionStrategy(from, to, actor)) {
    throw new Error(`Invalid strategy transition: ${from} → ${to}`);
  }
}

export function isStrategyEditable(status: StrategyStatus): boolean {
  return status === "draft" || status === "submitted";
}
