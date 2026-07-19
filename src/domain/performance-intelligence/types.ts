import type { RatingCategory, RatingEntityType, RatingTrend } from "@/constants/rating";

export interface RatingProfile {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
  rules: RatingProfileRules;
  createdAt: string;
  updatedAt: string;
}

export interface RatingCategoryWeight {
  id: string;
  profileId: string;
  category: RatingCategory;
  label: string;
  weight: number;
}

export interface RatingProfileRules {
  gradeBands?: Array<{ min: number; grade: string }>;
  starScale?: { minScore: number; maxScore: number; minStars: number; maxStars: number };
  categoryRules?: Record<string, Record<string, number>>;
}

export interface CategoryScoreBreakdown {
  category: RatingCategory;
  label: string;
  score: number;
  weight: number;
  weightedContribution: number;
  explanation: string;
}

export interface RatingSnapshot {
  id: string;
  entityType: RatingEntityType;
  entityId: string;
  profileId: string;
  overallScore: number;
  overallRating: number | null;
  performanceGrade: string | null;
  riskGrade: string | null;
  governanceGrade: string | null;
  consistencyScore: number | null;
  operationalScore: number | null;
  confidenceScore: number | null;
  categoryScores: Record<string, number>;
  explanations: Record<string, string>;
  sourceMetrics: Record<string, unknown>;
  trend: RatingTrend;
  computedAt: string;
}

export interface RatingHistoryEntry {
  id: string;
  entityType: RatingEntityType;
  entityId: string;
  profileId: string | null;
  previousRating: number | null;
  newRating: number;
  previousScore: number | null;
  newScore: number;
  reason: string;
  sourceMetrics: Record<string, unknown>;
  actorId: string | null;
  createdAt: string;
}

export interface ManagerRatingResult {
  snapshot: RatingSnapshot;
  breakdown: CategoryScoreBreakdown[];
  history: RatingHistoryEntry[];
  strengths: string[];
  improvements: string[];
}

export interface StrategyIntelligence {
  strategyId: string;
  strategyName: string;
  historicalPerformanceScore: number;
  completionRate: number;
  averageCycleDurationDays: number | null;
  fundingSuccessRate: number;
  riskClassification: string;
  operationalHealth: number;
  benchmarkComparison: string;
  activeCycles: number;
  completedCycles: number;
  rating: RatingSnapshot | null;
}

export interface CycleIntelligence {
  cycleId: string;
  cycleName: string;
  fundingVelocity: number | null;
  tradingActivity: number;
  operationalHealth: number;
  currentProgressPhase: string;
  completionPercentage: number;
  journalActivity: number;
  investorParticipation: number;
  rating: RatingSnapshot | null;
}

export interface PerformanceIntelligenceBundle {
  managerId: string;
  strategies: StrategyIntelligence[];
  cycles: CycleIntelligence[];
  platformMetrics: Record<string, unknown>;
}

export interface AdminIntelligenceDashboard {
  topManagers: Array<{ managerId: string; name: string; rating: number; score: number }>;
  highestRiskManagers: Array<{ managerId: string; name: string; riskGrade: string; score: number }>;
  governanceRankings: Array<{ managerId: string; name: string; governanceGrade: string; score: number }>;
  platformPerformance: {
    averageManagerRating: number;
    managersRated: number;
    ratingChangesLast30Days: number;
    operationalAlerts: number;
  };
  recentRatingChanges: RatingHistoryEntry[];
  activeProfile: RatingProfile | null;
}

export interface InvestorRatingView {
  overallRating: number | null;
  overallScore: number;
  performanceGrade: string | null;
  riskGrade: string | null;
  confidenceScore: number | null;
  trend: RatingTrend;
  breakdown: Array<{ label: string; score: number; explanation: string }>;
  comparedTo: string;
}
