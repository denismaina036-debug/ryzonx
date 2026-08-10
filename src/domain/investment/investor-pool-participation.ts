import type { WalletPoolParticipation } from "@/features/investor/types/wallet";
import type { CycleInvestorSettlement } from "@/services/investment-engine/cycle-investor-settlement.service";

export interface InvestorPoolParticipationView extends WalletPoolParticipation {
  hasActiveTradingCycle: boolean;
  hasActiveFundingCycle: boolean;
  pendingSettlement: CycleInvestorSettlement | null;
  /** Capital figure shown on the investments page for this pool. */
  displayCapitalInvested: number;
  /** True when the pool has no trading cycle and the investor must choose next steps. */
  showPostCycleChoices: boolean;
}

export function resolveInvestorDisplayCapital(input: {
  hasActiveTradingCycle: boolean;
  portfolioInvested: number;
  pendingSettlement: CycleInvestorSettlement | null;
  cycleAllocationAmount?: number | null;
}): number {
  if (input.hasActiveTradingCycle) {
    if (input.cycleAllocationAmount != null && input.cycleAllocationAmount > 0) {
      return input.cycleAllocationAmount;
    }
    return input.portfolioInvested;
  }

  if (
    input.pendingSettlement &&
    !input.pendingSettlement.capitalResolved &&
    input.pendingSettlement.principalAmount > 0
  ) {
    return input.pendingSettlement.principalAmount;
  }

  return input.portfolioInvested;
}

export function shouldShowPostCycleChoices(input: {
  hasActiveTradingCycle: boolean;
  hasActiveFundingCycle?: boolean;
  pendingSettlement: CycleInvestorSettlement | null;
  displayCapitalInvested: number;
  poolProfit?: number;
}): boolean {
  if (input.hasActiveTradingCycle || input.hasActiveFundingCycle) return false;

  if (input.pendingSettlement) {
    const profitPending =
      input.pendingSettlement.profitAmount > 0 && !input.pendingSettlement.profitResolved;
    const capitalPending =
      input.pendingSettlement.principalAmount > 0 && !input.pendingSettlement.capitalResolved;
    if (
      profitPending ||
      capitalPending ||
      input.pendingSettlement.status === "capital_withdrawal_requested"
    ) {
      return true;
    }
  }

  return input.displayCapitalInvested > 0 || (input.poolProfit ?? 0) > 0;
}

export function resolvePostCycleCapitalAmount(input: {
  pendingSettlement: CycleInvestorSettlement | null;
  displayCapitalInvested: number;
}): number {
  if (
    input.pendingSettlement &&
    !input.pendingSettlement.capitalResolved &&
    input.pendingSettlement.principalAmount > 0
  ) {
    return input.pendingSettlement.principalAmount;
  }
  return input.displayCapitalInvested;
}

export function resolvePostCycleProfitAmount(input: {
  pendingSettlement: CycleInvestorSettlement | null;
  poolProfit: number;
}): number {
  if (
    input.pendingSettlement &&
    !input.pendingSettlement.profitResolved &&
    input.pendingSettlement.profitAmount > 0
  ) {
    return input.pendingSettlement.profitAmount;
  }
  return input.poolProfit;
}
