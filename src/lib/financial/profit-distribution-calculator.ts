import type { TradeEntry } from "@/domain/trading-journal/types";

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
  investorProfitPool: number;
  investorSharePct: number;
  investorDistributionTotal: number;
  investorAllocations: InvestorProfitAllocation[];
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Frozen copier share as a fraction, using the cycle's full set capital. */
export function computeCycleAllocationShare(
  allocationAmount: number,
  cycleSetCapital: number
): number {
  if (allocationAmount <= 0 || cycleSetCapital <= 0) return 0;
  const sharePercentage = Math.round((allocationAmount / cycleSetCapital) * 10_000) / 100;
  return sharePercentage / 100;
}

export function computeTradeRealizedPnl(entry: TradeEntry): number {
  if (entry.status !== "closed") return 0;
  if (entry.realizedPnl != null && Number.isFinite(entry.realizedPnl)) {
    return roundMoney(entry.realizedPnl);
  }
  if (entry.exitPrice == null) return 0;
  const delta = entry.exitPrice - entry.entryPrice;
  const signed = entry.direction === "long" ? delta : -delta;
  return roundMoney(signed * entry.quantity);
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
