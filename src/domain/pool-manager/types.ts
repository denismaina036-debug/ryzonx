export const PM_APPLICATION_STATUS = {
  DRAFT: "draft",
  PENDING: "pending",
  UNDER_REVIEW: "under_review",
  REQUIRES_CHANGES: "requires_changes",
  INTERVIEW_REQUIRED: "interview_required",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type PoolManagerApplicationStatus =
  (typeof PM_APPLICATION_STATUS)[keyof typeof PM_APPLICATION_STATUS];

export const PM_APPLICATION_STAGES = {
  BASIC_INFO: 1,
  CHALLENGE: 2,
  STRATEGY: 3,
  ADMIN_REVIEW: 4,
  ACTIVATION: 5,
} as const;

export type PoolManagerApplicationStage =
  (typeof PM_APPLICATION_STAGES)[keyof typeof PM_APPLICATION_STAGES];

export const POOL_LIFECYCLE_STATUS = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  UNDER_REVIEW: "under_review",
  APPROVED: "approved",
  LIVE: "live",
  PAUSED: "paused",
  RESTRICTED: "restricted",
  CLOSED: "closed",
  ARCHIVED: "archived",
} as const;

export type PoolLifecycleStatus =
  (typeof POOL_LIFECYCLE_STATUS)[keyof typeof POOL_LIFECYCLE_STATUS];

export interface PoolManagerBasicInfo {
  tradingExperience?: string;
  yearsTrading?: number;
  marketsTraded?: string[];
  country?: string;
  tradingStyle?: string;
  averageMonthlyReturn?: number;
  previousCapitalManaged?: number;
  previousExperience?: string;
  biography?: string;
  /** Challenge account details provided by admin during review */
  challengeAccountInfo?: string;
}

export interface PoolManagerStrategyData {
  strategyName?: string;
  tradingPhilosophy?: string;
  marketsTraded?: string;
  timeframes?: string;
  entryStrategy?: string;
  exitStrategy?: string;
  tradeManagement?: string;
  riskManagement?: string;
  positionSizing?: string;
  maxRiskPerTrade?: string;
  maxDailyDrawdown?: string;
  maxOverallDrawdown?: string;
  maxOpenPositions?: string;
  newsTradingPolicy?: string;
  weekendHoldingPolicy?: string;
  psychologicalRules?: string;
  capitalPreservationRules?: string;
  emergencyStopRules?: string;
  expectedMonthlyReturn?: string;
  targetRiskLevel?: string;
  expectedInvestorProfile?: string;
  additionalNotes?: string;
}

export interface PoolManagerApplication {
  id: string;
  userId: string;
  status: PoolManagerApplicationStatus;
  currentStage: PoolManagerApplicationStage;
  basicInfo: PoolManagerBasicInfo;
  strategyData: PoolManagerStrategyData;
  strategySubmittedAt: string | null;
  challengeEnrollmentId: string | null;
  poolManagerId: string | null;
  adminNotes: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PoolManagerApplicationReview {
  id: string;
  applicationId: string;
  reviewerId: string;
  previousStatus: PoolManagerApplicationStatus | null;
  newStatus: PoolManagerApplicationStatus;
  notes: string | null;
  createdAt: string;
}

export interface PoolManagerPublicProfile {
  id: string;
  slug: string;
  userId: string | null;
  displayName: string;
  profilePhotoUrl: string | null;
  coverImageUrl: string | null;
  biography: string | null;
  tradingSince: string | null;
  country: string | null;
  markets: string[];
  tradingStyle: string | null;
  isVerified: boolean;
  ryvonxRating: number | null;
  securityRating: number | null;
  aggressivenessRating: number | null;
  winRatePct: number | null;
  avgMonthlyReturnPct: number | null;
  maxDrawdownPct: number | null;
  assetsUnderManagement: number;
  activeInvestors: number;
  poolsManaged: number;
  yearsOnRyvonX: number;
  approvedAt: string | null;
  managerLevel: string | null;
  achievements: Array<{ title: string; awardedAt: string }>;
}

export interface PoolManagerDashboardStats {
  poolsManaged: number;
  totalInvestors: number;
  assetsUnderManagement: number;
  newInvestorsThisMonth: number;
  pendingWithdrawals: number;
  recentDeposits: number;
}
