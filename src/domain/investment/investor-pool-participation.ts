import type { WalletPoolParticipation } from "@/features/investor/types/wallet";
import type { CycleInvestorSettlement } from "@/services/investment-engine/cycle-investor-settlement.service";

export interface InvestorPoolParticipationView extends WalletPoolParticipation {
  hasActiveTradingCycle: boolean;
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
  pendingSettlement: CycleInvestorSettlement | null;
}): boolean {
  if (input.hasActiveTradingCycle || !input.pendingSettlement) return false;

  const { pendingSettlement } = input;
  const profitPending = pendingSettlement.profitAmount > 0 && !pendingSettlement.profitResolved;
  const capitalPending =
    pendingSettlement.principalAmount > 0 && !pendingSettlement.capitalResolved;

  return profitPending || capitalPending;
}
