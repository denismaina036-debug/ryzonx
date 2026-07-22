import type { FixedReturnRow } from "@/domain/pools/fixed-return";
import {
  fixedReturnProfitAmount,
  resolveFixedReturnAmount,
} from "@/domain/pools/fixed-return";
import type {
  AllocationCapitalBasis,
  InvestorProfitAllocation,
  ProfitDistributionBreakdown,
} from "@/lib/financial/profit-distribution-calculator";
import { PLATFORM_SERVICE_FEE_RATE } from "@/constants/profit-distribution";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Fixed Return settlement (independent from Variable Return):
 * 1. Gross trading profit
 * 2. Deduct 2.5% platform fee
 * 3. Pay each investor their promised fixed return profit (total payout − principal)
 * 4. Pool Manager receives any remaining profit; nothing if insufficient
 * 5. Losses distributed proportionally by investment amount; PM receives nothing
 */
export function calculateFixedReturnDistribution(input: {
  grossTradingProfit: number;
  platformServiceFeeRate?: number;
  allocations: AllocationCapitalBasis[];
  fixedReturnSchedule: FixedReturnRow[];
}): ProfitDistributionBreakdown {
  const feeRate = input.platformServiceFeeRate ?? PLATFORM_SERVICE_FEE_RATE;
  const taxableGross = input.grossTradingProfit > 0 ? input.grossTradingProfit : 0;
  const platformServiceFee = roundMoney(taxableGross * feeRate);
  const netDistributableProfit = roundMoney(taxableGross - platformServiceFee);

  const rows = input.allocations.map((alloc) => {
    const totalPayout = resolveFixedReturnAmount(
      alloc.capitalBasis,
      input.fixedReturnSchedule
    );
    const promised =
      totalPayout != null
        ? fixedReturnProfitAmount(alloc.capitalBasis, totalPayout)
        : 0;
    return { ...alloc, totalPayout, promised };
  });

  const totalPromised = roundMoney(rows.reduce((s, r) => s + r.promised, 0));
  const totalCapital = roundMoney(rows.reduce((s, r) => s + r.capitalBasis, 0));

  let investorAllocations: InvestorProfitAllocation[];
  let poolManagerEarnings = 0;

  if (netDistributableProfit < 0) {
    const loss = netDistributableProfit;
    investorAllocations = rows.map((row) => {
      const share = totalCapital > 0 ? row.capitalBasis / totalCapital : 0;
      const profitShare = roundMoney(loss * share);
      return {
        allocationId: row.allocationId,
        investorId: row.investorId,
        capitalBasis: row.capitalBasis,
        tierReturnPct: null,
        returnMultiplier: 0,
        tierWeight: 0,
        allocationWeight: row.capitalBasis,
        ownershipPct: share,
        profitShare,
      };
    });
  } else if (totalPromised > 0 && netDistributableProfit >= totalPromised) {
    investorAllocations = rows.map((row) => ({
      allocationId: row.allocationId,
      investorId: row.investorId,
      capitalBasis: row.capitalBasis,
      tierReturnPct: null,
      returnMultiplier: 0,
      tierWeight: 0,
      allocationWeight: row.promised,
      ownershipPct: totalPromised > 0 ? row.promised / totalPromised : 0,
      profitShare: row.promised,
    }));
    poolManagerEarnings = roundMoney(netDistributableProfit - totalPromised);
  } else if (totalPromised > 0) {
    investorAllocations = rows.map((row) => {
      const share = row.promised / totalPromised;
      const profitShare = roundMoney(netDistributableProfit * share);
      return {
        allocationId: row.allocationId,
        investorId: row.investorId,
        capitalBasis: row.capitalBasis,
        tierReturnPct: null,
        returnMultiplier: 0,
        tierWeight: 0,
        allocationWeight: row.promised,
        ownershipPct: share,
        profitShare,
      };
    });
    poolManagerEarnings = 0;
  } else {
    const shareDenominator = totalCapital || 1;
    investorAllocations = rows.map((row) => {
      const share = row.capitalBasis / shareDenominator;
      const profitShare = roundMoney(netDistributableProfit * share);
      return {
        allocationId: row.allocationId,
        investorId: row.investorId,
        capitalBasis: row.capitalBasis,
        tierReturnPct: null,
        returnMultiplier: 0,
        tierWeight: 0,
        allocationWeight: row.capitalBasis,
        ownershipPct: share,
        profitShare,
      };
    });
    poolManagerEarnings = 0;
  }

  const investorProfitPool = roundMoney(
    investorAllocations.reduce((s, a) => s + a.profitShare, 0)
  );

  return {
    grossTradingProfit: taxableGross,
    platformServiceFeePct: feeRate * 100,
    platformServiceFee,
    netDistributableProfit,
    poolManagerSharePct: 0,
    poolManagerEarnings,
    investorProfitPool,
    investorSharePct:
      netDistributableProfit > 0
        ? roundMoney((investorProfitPool / netDistributableProfit) * 100)
        : 100,
    investorDistributionTotal: investorProfitPool,
    returnStructureAllocations: [],
    investorAllocations,
  };
}
