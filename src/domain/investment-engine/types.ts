export type InvestmentQueueType = "investment" | "withdrawal" | "reinvestment";
export type InvestmentQueueStatus = "pending" | "processed" | "cancelled";

export interface PoolInvestorPosition {
  id: string;
  fundId: string;
  investorId: string | null;
  isVirtual: boolean;
  virtualLabel: string | null;
  capital: number;
}

export interface InvestmentQueueItem {
  id: string;
  fundId: string;
  investorId: string;
  queueType: InvestmentQueueType;
  amount: number;
  status: InvestmentQueueStatus;
  targetCycleId: string | null;
  sourceSettlementId: string | null;
  notes: string | null;
  processedAt: string | null;
  createdAt: string;
}

export interface CycleOwnershipSnapshot {
  id: string;
  investmentCycleId: string;
  fundId: string;
  investorId: string | null;
  isVirtual: boolean;
  virtualLabel: string | null;
  capital: number;
  ownershipPct: number;
  poolCapitalTotal: number;
  snapshotAt: string;
}

export interface InvestorProfitWallet {
  investorId: string;
  fundId: string;
  balance: number;
  sourceCycleId?: string | null;
}
