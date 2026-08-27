import type { InvestmentAllocationStatus } from "@/constants/investment-allocation";
import type { WalletPoolParticipation } from "@/features/investor/types/wallet";
import type { CycleInvestorSettlement } from "@/services/investment-engine/cycle-investor-settlement.service";

const ACTIVE_INVESTOR_ALLOCATION_STATUSES = new Set<InvestmentAllocationStatus>([
  "pending",
  "funding_confirmed",
  "confirmed",
  "settled",
  "locked",
  "distributed",
]);

export interface InvestorPoolParticipationView extends WalletPoolParticipation {
  hasActiveTradingCycle: boolean;
  hasActiveFundingCycle: boolean;
  pendingSettlement: CycleInvestorSettlement | null;
  /** Capital figure shown on the investments page for this pool. */
  displayCapitalInvested: number;
  /** True when the pool has no trading cycle and the investor must choose next steps. */
  showPostCycleChoices: boolean;
}

/** Count each pool once — prefer cycle allocations over legacy portfolio rows. */
export function resolveInvestorCapitalExposure(
  participations: Array<{ fundId: string; amountInvested: number }>,
  allocations: Array<{
    fundId: string;
    amount: number;
    returnedCapitalAmount?: number;
    status: InvestmentAllocationStatus | string;
  }>
): number {
  const allocationByFund = new Map<string, number>();
  const allocationFundIds = new Set<string>();
  for (const allocation of allocations) {
    if (!ACTIVE_INVESTOR_ALLOCATION_STATUSES.has(allocation.status as InvestmentAllocationStatus)) {
      continue;
    }
    allocationFundIds.add(allocation.fundId);
    const returnableAmount = Math.max(
      0,
      allocation.amount - (allocation.returnedCapitalAmount ?? 0)
    );
    if (returnableAmount <= 0) continue;
    allocationByFund.set(
      allocation.fundId,
      (allocationByFund.get(allocation.fundId) ?? 0) + returnableAmount
    );
  }

  const fundIds = new Set([
    ...participations.map((participation) => participation.fundId),
    ...allocationFundIds,
    ...allocationByFund.keys(),
  ]);

  let total = 0;
  for (const fundId of fundIds) {
    const allocationTotal = allocationByFund.get(fundId);
    const portfolioAmount =
      participations.find((participation) => participation.fundId === fundId)?.amountInvested ?? 0;
    total += allocationFundIds.has(fundId) ? allocationTotal ?? 0 : portfolioAmount;
  }

  return total;
}

export function resolveInvestorDisplayCapital(input: {
  hasActiveTradingCycle: boolean;
  hasActiveFundingCycle?: boolean;
  portfolioInvested: number;
  pendingSettlement: CycleInvestorSettlement | null;
  cycleAllocationAmount?: number | null;
}): number {
  if (input.hasActiveTradingCycle || input.hasActiveFundingCycle) {
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
  if (input.hasActiveTradingCycle) return false;

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

  if ((input.poolProfit ?? 0) > 0) return true;

  if (input.hasActiveFundingCycle) return false;

  return input.displayCapitalInvested > 0;
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
