import type {
  AllocationCapitalBasis,
  InvestorProfitAllocation,
  ProfitDistributionBreakdown,
  ProfitSharingAgreement,
} from "@/lib/financial/profit-distribution-calculator";
import { PLATFORM_SERVICE_FEE_RATE } from "@/constants/profit-distribution";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Variable Return settlement (independent from Fixed Return):
 * 1. Gross trading profit
 * 2. Deduct 2.5% platform fee
 * 3. Split net profit using Investor / Pool Manager profit share percentages
 * 4. Allocate investor pool by each investor's share of target capital
 * 5. Pool Manager receives configured manager share
 */
export function calculateVariableReturnDistribution(input: {
  grossTradingProfit: number;
  platformServiceFeeRate?: number;
  profitSharing: ProfitSharingAgreement;
  targetCapital: number;
  allocations: AllocationCapitalBasis[];
}): ProfitDistributionBreakdown {
  const feeRate = input.platformServiceFeeRate ?? PLATFORM_SERVICE_FEE_RATE;
  const taxableGross = input.grossTradingProfit > 0 ? input.grossTradingProfit : 0;
  const platformServiceFee = roundMoney(taxableGross * feeRate);
  const netDistributableProfit = roundMoney(taxableGross - platformServiceFee);

  const investorSharePct = input.profitSharing.investorSharePct;
  const poolManagerSharePct = input.profitSharing.poolManagerSharePct;
  const capitalDenominator =
    input.targetCapital > 0
      ? input.targetCapital
      : roundMoney(input.allocations.reduce((s, a) => s + a.capitalBasis, 0)) || 1;

  let investorAllocations: InvestorProfitAllocation[];
  let poolManagerEarnings = 0;
  let investorProfitPool = 0;

  if (netDistributableProfit < 0) {
    const loss = netDistributableProfit;
    const totalCapital = roundMoney(
      input.allocations.reduce((s, a) => s + a.capitalBasis, 0)
    );
    investorAllocations = input.allocations.map((alloc) => {
      const ownershipPct =
        totalCapital > 0 ? alloc.capitalBasis / totalCapital : 0;
      const profitShare = roundMoney(loss * ownershipPct);
      return {
        allocationId: alloc.allocationId,
        investorId: alloc.investorId,
        capitalBasis: alloc.capitalBasis,
        tierReturnPct: null,
        returnMultiplier: 0,
        tierWeight: 0,
        allocationWeight: alloc.capitalBasis,
        ownershipPct,
        profitShare,
      };
    });
    investorProfitPool = roundMoney(
      investorAllocations.reduce((s, a) => s + a.profitShare, 0)
    );
  } else {
    poolManagerEarnings = roundMoney(
      netDistributableProfit * (poolManagerSharePct / 100)
    );
    investorProfitPool = roundMoney(
      netDistributableProfit * (investorSharePct / 100)
    );

    investorAllocations = input.allocations.map((alloc) => {
      const ownershipPct = alloc.capitalBasis / capitalDenominator;
      const profitShare = roundMoney(investorProfitPool * ownershipPct);
      return {
        allocationId: alloc.allocationId,
        investorId: alloc.investorId,
        capitalBasis: alloc.capitalBasis,
        tierReturnPct: null,
        returnMultiplier: 0,
        tierWeight: 0,
        allocationWeight: alloc.capitalBasis,
        ownershipPct: roundMoney(ownershipPct * 1_000_000) / 1_000_000,
        profitShare,
      };
    });

    const allocatedTotal = roundMoney(
      investorAllocations.reduce((s, a) => s + a.profitShare, 0)
    );
    const remainder = roundMoney(investorProfitPool - allocatedTotal);
    if (remainder !== 0 && investorAllocations.length > 0) {
      const lastIndex = investorAllocations.length - 1;
      investorAllocations[lastIndex] = {
        ...investorAllocations[lastIndex]!,
        profitShare: roundMoney(investorAllocations[lastIndex]!.profitShare + remainder),
      };
    }
  }

  return {
    grossTradingProfit: taxableGross,
    platformServiceFeePct: feeRate * 100,
    platformServiceFee,
    netDistributableProfit,
    poolManagerSharePct,
    poolManagerEarnings,
    investorProfitPool,
    investorSharePct:
      netDistributableProfit > 0
        ? roundMoney((investorProfitPool / netDistributableProfit) * 100)
        : investorSharePct,
    investorDistributionTotal: investorProfitPool,
    returnStructureAllocations: [],
    investorAllocations,
  };
}
