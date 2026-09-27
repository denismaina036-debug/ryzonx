import type { InvestmentAllocationStatus } from "@/constants/investment-allocation";

export type CorrectionAllocation = {
  id: string;
  amount: number;
  status: InvestmentAllocationStatus;
  investment_cycle_id: string;
  investment_cycles: {
    fund_id: string | null;
    funds: { name: string } | null;
  } | null;
};

export function selectActiveStrategyAllocations(
  allocations: CorrectionAllocation[],
  activeFundIds: Set<string>
): CorrectionAllocation[] {
  const selectedFunds = new Set<string>();

  return allocations.filter((allocation) => {
    const fundId = allocation.investment_cycles?.fund_id;
    if (!fundId || !activeFundIds.has(fundId) || selectedFunds.has(fundId)) return false;
    selectedFunds.add(fundId);
    return true;
  });
}
