import type { ReturnTier } from "@/features/investor/types/account";
import { resolveReturnTier } from "@/lib/financial/return-structure-distribution";
import type {
  AllocationCapitalBasis,
  InvestorProfitAllocation,
  ProfitDistributionBreakdown,
} from "@/lib/financial/profit-distribution-calculator";
import { PLATFORM_SERVICE_FEE_RATE } from "@/constants/profit-distribution";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function promisedReturnAmount(investment: number, tier: ReturnTier | null): number {
  if (!tier || investment <= 0) return 0;
  return roundMoney(investment * (Number(tier.returnPct) / 100));
}

/**
 * Fixed Return settlement:
 * 1. Gross profit → 2.5% platform fee → net
 * 2. If net covers total promised fixed returns → pay promises, PM gets remainder
 * 3. If insufficient → pro-rata by entitlement, PM gets nothing
 * 4. If loss → pro-rata loss by capital contribution
 */
export function calculateFixedReturnDistribution(input: {
  grossTradingProfit: number;
  platformServiceFeeRate?: number;
  allocations: AllocationCapitalBasis[];
  returnStructure: ReturnTier[];
}): ProfitDistributionBreakdown {
  const feeRate = input.platformServiceFeeRate ?? PLATFORM_SERVICE_FEE_RATE;
  const taxableGross = input.grossTradingProfit > 0 ? input.grossTradingProfit : 0;
  const platformServiceFee = roundMoney(taxableGross * feeRate);
  const netDistributableProfit = roundMoney(taxableGross - platformServiceFee);

  const rows = input.allocations.map((alloc) => {
    const tier = resolveReturnTier(alloc.capitalBasis, input.returnStructure);
    const promised = promisedReturnAmount(alloc.capitalBasis, tier);
    return { ...alloc, tier, promised };
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
        tierReturnPct: row.tier ? Number(row.tier.returnPct) : null,
        returnMultiplier: 0,
        tierWeight: row.tier ? Number(row.tier.returnPct) : 0,
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
      tierReturnPct: row.tier ? Number(row.tier.returnPct) : null,
      returnMultiplier: row.tier ? Number(row.tier.returnPct) / 100 : 0,
      tierWeight: row.tier ? Number(row.tier.returnPct) : 0,
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
        tierReturnPct: row.tier ? Number(row.tier.returnPct) : null,
        returnMultiplier: row.tier ? Number(row.tier.returnPct) / 100 : 0,
        tierWeight: row.tier ? Number(row.tier.returnPct) : 0,
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
        returnMultiplier: 1,
        tierWeight: 100,
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
