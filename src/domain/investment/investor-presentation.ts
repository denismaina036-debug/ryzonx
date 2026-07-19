import type { StrategyRiskProfile } from "@/constants/strategy";
import type { InvestmentAllocationStatus } from "@/constants/investment-allocation";
import type { InvestmentCycleStatus } from "@/constants/investment-cycle";

export interface InvestorStrategyCard {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  riskProfile: StrategyRiskProfile | null;
  investmentStyle: string | null;
  supportedAssets: string[];
  managerId: string;
  managerName: string;
  managerSlug: string | null;
  managerRating: number | null;
  activeCyclesCount: number;
  approvedAt: string | null;
}

export interface InvestorCycleCard {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: InvestmentCycleStatus;
  strategyId: string;
  strategyName: string;
  strategySlug: string;
  riskProfile: StrategyRiskProfile | null;
  managerId: string;
  managerName: string;
  managerSlug: string | null;
  managerRating: number | null;
  targetCapital: number | null;
  raisedCapital: number;
  minInvestment: number | null;
  maxCapacity: number | null;
  remainingCapacity: number | null;
  fundingPct: number | null;
  fundingDeadline: string | null;
  durationDays: number | null;
  investorCount: number;
  isAllocatable: boolean;
}

export interface InvestorAllocationView {
  id: string;
  amount: number;
  currency: string;
  status: InvestmentAllocationStatus;
  referenceNumber: string;
  allocatedAt: string;
  cycleId: string;
  cycleName: string;
  cycleSlug: string;
  cycleStatus: InvestmentCycleStatus;
  strategyName: string;
  managerName: string;
  canCancel: boolean;
}

export interface InvestorPortfolioData {
  balance: number;
  totalInvestedLegacy: number;
  totalCommittedCycles: number;
  pendingAllocations: InvestorAllocationView[];
  activeAllocations: InvestorAllocationView[];
  legacyParticipations: import("@/features/investor/types/wallet").WalletPoolParticipation[];
  riskExposure: Array<{ label: string; amount: number; pct: number }>;
  strategyExposure: Array<{ strategyName: string; amount: number; cycleCount: number }>;
  timeline: Array<{ label: string; date: string; type: "allocation" | "legacy" }>;
}

export interface InvestorHomeData {
  recommendedCycles: InvestorCycleCard[];
  featuredManagers: Array<{
    id: string;
    slug: string | null;
    displayName: string;
    ryvonxRating: number | null;
    assetsUnderManagement: number;
    activeInvestors: number;
    tradingStyle: string | null;
  }>;
  activeCycles: InvestorCycleCard[];
  recentStrategies: InvestorStrategyCard[];
  pendingAllocations: InvestorAllocationView[];
  portfolioSummary: {
    balance: number;
    legacyInvested: number;
    cycleCommitted: number;
    pendingCount: number;
  };
}
