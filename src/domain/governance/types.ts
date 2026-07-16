export interface GovernanceDashboardSummary {
  underReview: GovernancePoolSummary[];
  watchlist: GovernancePoolSummary[];
  healthy: GovernancePoolSummary[];
  warning: GovernancePoolSummary[];
  probation: GovernancePoolSummary[];
  restricted: GovernancePoolSummary[];
  suspended: GovernancePoolSummary[];
  recentActions: GovernanceTimelineEntry[];
  recentViolations: GovernanceViolation[];
  upcomingReviews: GovernanceUpcomingReview[];
  metrics: GovernanceMetrics;
}

export interface GovernanceMetrics {
  totalActivePools: number;
  poolsUnderReview: number;
  openViolations: number;
  poolsOnProbation: number;
  suspendedPools: number;
  healthyPools: number;
}

export interface GovernancePoolSummary {
  id: string;
  name: string;
  slug: string;
  poolHealth: string;
  governanceStage: string;
  managerName: string | null;
  managerId: string | null;
  activeInvestors: number;
  assetsUnderManagement: number;
  onProbation: boolean;
  underGovernanceReview: boolean;
  nextReviewAt: string | null;
}

export interface GovernanceRule {
  id: string;
  fundId: string | null;
  fundName: string | null;
  ruleKey: string;
  ruleName: string;
  description: string | null;
  ruleType: string;
  thresholdValue: number | null;
  thresholdUnit: string | null;
  defaultSeverity: string;
  isActive: boolean;
  createdAt: string;
}

export interface GovernanceViolation {
  id: string;
  fundId: string;
  fundName: string;
  poolManagerId: string | null;
  managerName: string | null;
  ruleKey: string;
  ruleName: string;
  actualValue: number | null;
  expectedValue: number | null;
  violationAt: string;
  severity: string;
  status: string;
  adminNotes: string | null;
}

export interface GovernanceWarning {
  id: string;
  fundId: string;
  fundName: string;
  poolManagerId: string | null;
  level: string;
  title: string;
  description: string | null;
  reason: string | null;
  adminNotes: string | null;
  requiredAction: string | null;
  responseDeadline: string | null;
  issuedByName: string | null;
  createdAt: string;
}

export interface GovernanceReview {
  id: string;
  fundId: string;
  fundName: string;
  poolManagerId: string | null;
  reviewType: string;
  reviewDate: string;
  reviewerName: string | null;
  performanceSummary: string | null;
  riskAnalysis: string | null;
  ruleCompliance: string | null;
  observations: string | null;
  strengths: string | null;
  weaknesses: string | null;
  requiredImprovements: string | null;
  recommendation: string | null;
  finalRating: string | null;
  visibility: string;
  committeeLabel: string | null;
  createdAt: string;
}

export interface GovernanceScore {
  id: string;
  fundId: string | null;
  poolManagerId: string | null;
  category: string;
  score: number;
  notes: string | null;
  scoredByName: string | null;
  scoredAt: string;
}

export interface GovernanceTimelineEntry {
  id: string;
  fundId: string | null;
  fundName: string | null;
  poolManagerId: string | null;
  eventType: string;
  title: string;
  description: string | null;
  previousStage: string | null;
  newStage: string | null;
  committeeLabel: string | null;
  actorName: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface GovernanceUpcomingReview {
  fundId: string;
  fundName: string;
  nextReviewAt: string;
  reviewFrequency: string | null;
}

export interface PoolGovernanceDetail {
  pool: GovernancePoolSummary & {
    governanceVerified: boolean;
    governanceApproved: boolean;
    pauseNewInvestments: boolean;
    pauseWithdrawals: boolean;
    freezeMarketing: boolean;
    hideFromMarketplace: boolean;
    requireAdditionalReview: boolean;
    tradingSuspended: boolean;
    suspensionReason: string | null;
    suspensionNotes: string | null;
    suspendedAt: string | null;
    probationEndsAt: string | null;
    probationNotes: string | null;
    reviewFrequency: string | null;
    lifecycleStatus: string;
  };
  violations: GovernanceViolation[];
  warnings: GovernanceWarning[];
  reviews: GovernanceReview[];
  scores: GovernanceScore[];
  timeline: GovernanceTimelineEntry[];
  protectionIndicators: string[];
  monitoringMetrics: PoolMonitoringMetrics;
}

export interface PoolMonitoringMetrics {
  poolGrowthPct: number | null;
  maxDrawdownPct: number | null;
  monthlyReturnPct: number | null;
  winRatePct: number | null;
  activeInvestors: number;
  assetsUnderManagement: number;
  openViolations: number;
  recentWarnings: number;
}

export interface GovernanceRestrictionsInput {
  pauseNewInvestments?: boolean;
  pauseWithdrawals?: boolean;
  freezeMarketing?: boolean;
  hideFromMarketplace?: boolean;
  requireAdditionalReview?: boolean;
  tradingSuspended?: boolean;
}
