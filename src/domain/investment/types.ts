import type { StrategyRiskProfile, StrategyStatus, StrategyVisibility } from "@/constants/strategy";
import type { InvestmentAllocationStatus } from "@/constants/investment-allocation";
import type { InvestmentCycleStatus } from "@/constants/investment-cycle";

export interface Strategy {
  id: string;
  poolManagerId: string;
  slug: string;
  name: string;
  description: string | null;
  objectives: string | null;
  riskProfile: StrategyRiskProfile | null;
  investmentStyle: string | null;
  supportedAssets: string[];
  status: StrategyStatus;
  visibility: StrategyVisibility;
  submittedAt: string | null;
  approvedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

import type { PoolConfigSnapshot } from "@/domain/pools/pool-config-snapshot";

export interface InvestmentCycle {
  id: string;
  strategyId: string;
  poolManagerId: string;
  fundId: string | null;
  cycleNumber: number;
  poolVersion: number;
  poolConfigSnapshot: PoolConfigSnapshot | null;
  name: string;
  slug: string;
  description: string | null;
  status: InvestmentCycleStatus;
  targetCapital: number | null;
  minInvestment: number | null;
  maxCapacity: number | null;
  raisedCapital: number;
  remainingCapital?: number | null;
  fundingProgressPct?: number | null;
  investorCount: number;
  openingDate: string | null;
  closingDate: string | null;
  fundingDeadline: string | null;
  durationDays: number | null;
  submittedAt: string | null;
  approvedAt: string | null;
  fundingStartedAt: string | null;
  tradingStartedAt: string | null;
  distributionStartedAt: string | null;
  completedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentAllocation {
  id: string;
  investmentCycleId: string;
  investorId: string;
  amount: number;
  currency: string;
  status: InvestmentAllocationStatus;
  referenceNumber: string;
  allocatedAt: string;
  lockedAt: string | null;
  fundingConfirmedAt: string | null;
  settledAt: string | null;
  settlementTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStrategyInput {
  name: string;
  slug?: string;
  description?: string;
  objectives?: string;
  riskProfile?: StrategyRiskProfile;
  investmentStyle?: string;
  supportedAssets?: string[];
  visibility?: StrategyVisibility;
}

export interface UpdateStrategyInput {
  name?: string;
  description?: string | null;
  objectives?: string | null;
  riskProfile?: StrategyRiskProfile | null;
  investmentStyle?: string | null;
  supportedAssets?: string[];
  visibility?: StrategyVisibility;
}

export interface CreateInvestmentCycleInput {
  strategyId: string;
  name: string;
  slug?: string;
  description?: string;
  targetCapital?: number;
  minInvestment?: number;
  maxCapacity?: number;
  fundingDeadline?: string;
  durationDays?: number;
}

export interface CreatePoolInvestmentCycleInput {
  fundId: string;
  name?: string;
  openingDate?: string;
  closingDate?: string;
}

export interface UpdateInvestmentCycleInput {
  name?: string;
  description?: string | null;
  targetCapital?: number | null;
  minInvestment?: number | null;
  maxCapacity?: number | null;
  fundingDeadline?: string | null;
  durationDays?: number | null;
}

export interface CreateInvestmentAllocationInput {
  investmentCycleId: string;
  amount: number;
  currency?: string;
}
