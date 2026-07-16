export interface CapitalAllocationDashboard {
  settings: CapitalSettings;
  metrics: CapitalMetrics;
  activeAllocations: CapitalAllocationSummary[];
  pendingReviews: CapitalAllocationSummary[];
  candidates: CapitalAllocationSummary[];
  managerRankings: ManagerRanking[];
  recentHistory: CapitalAllocationRecord[];
}

export interface CapitalSettings {
  totalAvailableCapital: number;
  totalAllocatedCapital: number;
  minAllocation: number | null;
  maxAllocation: number | null;
  defaultReviewFrequency: string | null;
  performanceExpectations: string | null;
}

export interface CapitalMetrics {
  availableCapital: number;
  allocatedCapital: number;
  utilizationPct: number;
  activeAllocationCount: number;
  pendingReviewCount: number;
  backedPoolCount: number;
  totalCombinedAum: number;
}

export interface CapitalAllocationSummary {
  fundId: string;
  fundName: string;
  managerId: string | null;
  managerName: string | null;
  managerLevel: string | null;
  investorCapital: number;
  ryvonxCapital: number;
  totalAum: number;
  investorPct: number;
  ryvonxPct: number;
  allocationStatus: string;
  isRyvonxBacked: boolean;
  growthRatePct: number | null;
  activeInvestors: number;
  nextReviewAt: string | null;
}

export interface CapitalAllocationRecord {
  id: string;
  fundId: string;
  fundName: string;
  managerName: string | null;
  action: string;
  amount: number;
  previousAmount: number | null;
  status: string;
  committeeLabel: string | null;
  reviewNotes: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface PoolCapitalBreakdown {
  investorCapital: number;
  ryvonxCapital: number;
  totalAum: number;
  investorPct: number;
  ryvonxPct: number;
  growthRatePct: number | null;
  activeInvestors: number;
  capacityStatus: string;
  allocationStatus: string;
  isRyvonxBacked: boolean;
  allocationReviewAt: string | null;
}

export interface ManagerDevelopmentProfile {
  managerId: string;
  displayName: string;
  managerLevel: string;
  levelPromotedAt: string | null;
  nextLevelReviewAt: string | null;
  developmentNotes: string | null;
  governanceStage: string;
  achievements: ManagerAchievement[];
  careerEvents: CareerEvent[];
  promotionRequirements: string[];
  nextLevel: string | null;
  pools: Array<{
    id: string;
    name: string;
    allocationStatus: string;
    isRyvonxBacked: boolean;
    totalAum: number;
  }>;
  evaluationSummary: string | null;
}

export interface ManagerAchievement {
  id: string;
  achievementKey: string;
  title: string;
  description: string | null;
  awardedAt: string;
  committeeLabel: string | null;
}

export interface CareerEvent {
  id: string;
  eventType: string;
  title: string;
  description: string | null;
  previousLevel: string | null;
  newLevel: string | null;
  committeeLabel: string | null;
  createdAt: string;
}

export interface ManagerContentItem {
  id: string;
  poolManagerId: string;
  managerName: string | null;
  fundId: string | null;
  fundName: string | null;
  contentType: string;
  title: string;
  body: string;
  status: string;
  submittedAt: string | null;
  publishedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
}

export interface AchievementDefinition {
  id: string;
  achievementKey: string;
  title: string;
  description: string | null;
  category: string;
  isActive: boolean;
}

export interface ManagerRanking {
  managerId: string;
  displayName: string;
  managerLevel: string;
  totalAum: number;
  ryvonxCapital: number;
  activeInvestors: number;
  poolsManaged: number;
  isRyvonxBacked: boolean;
}
