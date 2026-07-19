import { PLATFORM_SERVICE_FEE_RATE } from "@/constants/profit-distribution";
import type { ReturnTier } from "@/features/investor/types/account";
import type { TradeEntry } from "@/domain/trading-journal/types";
import {
  distributeInvestorProfitPool,
  type ReturnStructureAllocation,
} from "@/lib/financial/return-structure-distribution";

export interface ProfitSharingAgreement {
  investorSharePct: number;
  poolManagerSharePct: number;
}

export interface AllocationCapitalBasis {
  allocationId: string;
  investorId: string;
  capitalBasis: number;
}

export interface InvestorProfitAllocation {
  allocationId: string;
  investorId: string;
  capitalBasis: number;
  tierReturnPct: number | null;
  returnMultiplier: number;
  tierWeight: number;
  allocationWeight: number;
  /** Share of the Investor Profit Pool (0–1). */
  ownershipPct: number;
  profitShare: number;
}

export interface ProfitDistributionBreakdown {
  grossTradingProfit: number;
  platformServiceFeePct: number;
  platformServiceFee: number;
  netDistributableProfit: number;
  poolManagerSharePct: number;
  poolManagerEarnings: number;
  /** Remaining profit after PM share — distributed via Return Structure. */
  investorProfitPool: number;
  /** Derived: investorProfitPool as % of net (for display / records). */
  investorSharePct: number;
  /** @deprecated Alias for investorProfitPool — kept for backward compatibility. */
  investorDistributionTotal: number;
  returnStructureAllocations: ReturnStructureAllocation[];
  investorAllocations: InvestorProfitAllocation[];
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeTradeRealizedPnl(entry: TradeEntry): number {
  if (entry.status !== "closed" || entry.exitPrice == null) return 0;
  const delta = entry.exitPrice - entry.entryPrice;
  const signed = entry.direction === "long" ? delta : -delta;
  return signed * entry.quantity;
}

/** Sum of closed-trade PnL; losses reduce total but fee applies only when net is positive. */
export function computeCycleRealizedTradingProfit(entries: TradeEntry[]): number {
  const net = entries
    .filter((e) => e.status === "closed")
    .reduce((sum, e) => sum + computeTradeRealizedPnl(e), 0);
  return roundMoney(net);
}

/** Fee is charged only on positive realized profit. Never on deposits, capital, or losses. */
export function taxableRealizedProfit(netRealizedProfit: number): number {
  return netRealizedProfit > 0 ? netRealizedProfit : 0;
}

function mapStructureToInvestorAllocation(
  row: ReturnStructureAllocation
): InvestorProfitAllocation {
  return {
    allocationId: row.allocationId,
    investorId: row.investorId,
    capitalBasis: row.investmentAmount,
    tierReturnPct: row.tierReturnPct,
    returnMultiplier: row.returnMultiplier,
    tierWeight: row.tierWeight,
    allocationWeight: row.allocationWeight,
    ownershipPct: row.allocationPct,
    profitShare: row.profitShare,
  };
}

/**
 * Official settlement sequence:
 * 1. Gross Trading Profit
 * 2. Deduct RyvonX Platform Service Fee (2.5%)
 * 3. Net Distributable Profit
 * 4. Pool Manager Share (profit sharing agreement)
 * 5. Investor Profit Pool (remainder)
 * 6. Return Structure Distribution Engine → per-investor allocations
 */
export function calculateProfitDistribution(input: {
  grossTradingProfit: number;
  platformServiceFeeRate?: number;
  profitSharing: ProfitSharingAgreement;
  allocations: AllocationCapitalBasis[];
  returnStructure?: ReturnTier[];
}): ProfitDistributionBreakdown {
  // Step 1–3: Gross → Platform Fee → Net
  const taxableGross = taxableRealizedProfit(input.grossTradingProfit);
  const feeRate = input.platformServiceFeeRate ?? PLATFORM_SERVICE_FEE_RATE;
  const platformServiceFee = roundMoney(taxableGross * feeRate);
  const netDistributableProfit = roundMoney(taxableGross - platformServiceFee);

  const poolManagerSharePct = input.profitSharing.poolManagerSharePct;

  // Step 4: Pool Manager Share (before any investor distribution)
  const poolManagerEarnings = roundMoney(
    netDistributableProfit * (poolManagerSharePct / 100)
  );

  // Step 5: Investor Profit Pool — remainder after PM share
  const investorProfitPool = roundMoney(netDistributableProfit - poolManagerEarnings);

  const investorSharePct =
    netDistributableProfit > 0
      ? roundMoney((investorProfitPool / netDistributableProfit) * 100)
      : input.profitSharing.investorSharePct;

  // Step 6: Return Structure Distribution Engine
  const returnStructureAllocations = distributeInvestorProfitPool({
    investorProfitPool,
    participants: input.allocations.map((alloc) => ({
      allocationId: alloc.allocationId,
      investorId: alloc.investorId,
      investmentAmount: alloc.capitalBasis,
    })),
    returnStructure: input.returnStructure ?? [],
  });

  const investorAllocations = returnStructureAllocations.map(mapStructureToInvestorAllocation);

  return {
    grossTradingProfit: taxableGross,
    platformServiceFeePct: feeRate,
    platformServiceFee,
    netDistributableProfit,
    poolManagerSharePct,
    poolManagerEarnings,
    investorProfitPool,
    investorSharePct,
    investorDistributionTotal: investorProfitPool,
    returnStructureAllocations,
    investorAllocations,
  };
}
