import type { InvestmentCycleStatus } from "@/constants/investment-cycle";

export function isCycleFundingPhase(status: InvestmentCycleStatus | string): boolean {
  return status === "approved" || status === "funding";
}

export function isCycleTradingPhase(status: InvestmentCycleStatus | string): boolean {
  return status === "trading" || status === "distribution";
}
