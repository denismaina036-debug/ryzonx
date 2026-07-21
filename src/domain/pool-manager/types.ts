import type { PmSocialLinks } from "@/domain/pool-manager/public-profile";

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

/** Wizard sections (1–7) before admin review */
export const PM_APPLICATION_SECTIONS = {
  PROFESSIONAL_BACKGROUND: 1,
  TRADING_METHODOLOGY: 2,
  RISK_MANAGEMENT: 3,
  TRADING_PERFORMANCE: 4,
  PERSONAL_STATEMENT: 5,
  ADMISSION_PATH: 6,
  REVIEW: 7,
} as const;

export type PoolManagerApplicationSection =
  (typeof PM_APPLICATION_SECTIONS)[keyof typeof PM_APPLICATION_SECTIONS];

export const PM_APPLICATION_STAGES = {
  ...PM_APPLICATION_SECTIONS,
  ADMIN_REVIEW: 8,
  ACTIVATION: 9,
  /** @deprecated legacy alias */
  BASIC_INFO: 1,
  /** @deprecated legacy alias */
  CHALLENGE: 2,
  /** @deprecated legacy alias */
  STRATEGY: 3,
} as const;

export type PoolManagerApplicationStage =
  (typeof PM_APPLICATION_STAGES)[keyof typeof PM_APPLICATION_STAGES];

export const PM_ADMISSION_PATH = {
  TRADING_CHALLENGE: "trading_challenge",
  DIRECT_ACCESS: "direct_access",
} as const;

export type PoolManagerAdmissionPath =
  (typeof PM_ADMISSION_PATH)[keyof typeof PM_ADMISSION_PATH];

export type PoolManagerPaymentStatus = "pending" | "paid" | "waived";

export interface ProfessionalBackgroundSection {
  tradingExperience?: string;
  marketsTraded?: string[];
  primaryTradingInstrument?: string;
  primaryTradingInstrumentOther?: string;
  primaryTradingInstruments?: string[];
  countryOfResidence?: string;
}

export interface TradingMethodologySection {
  primaryTradingStyle?: string;
  averageTradeDuration?: string;
  tradingStrategy?: string;
  marketAnalysisApproach?: string[];
}

export interface RiskManagementSection {
  averageRiskPerTrade?: string;
  maximumDrawdown?: string;
  riskManagementProcess?: string;
  managingLosingStreaks?: string;
}

export interface TradingPerformanceSection {
  maintainsTradingJournal?: boolean;
  hasTradedFundedAccounts?: boolean;
  fundedAccountExperience?: string;
  hasManagedInvestorCapital?: boolean;
  capitalManagementExperience?: string;
  averageMonthlyReturn?: string;
  largestHistoricalDrawdown?: string;
}

export interface PersonalStatementSection {
  whyPoolManager?: string;
  tradingApproachDifference?: string;
  investorExpectations?: string;
}

export interface ApplicationReviewConfirmations {
  informationAccurate?: boolean;
  agreesToTerms?: boolean;
  understandsNotGuaranteed?: boolean;
}

export interface PoolManagerApplicationData {
  professionalBackground?: ProfessionalBackgroundSection;
  tradingMethodology?: TradingMethodologySection;
  riskManagement?: RiskManagementSection;
  tradingPerformance?: TradingPerformanceSection;
  personalStatement?: PersonalStatementSection;
  admissionPath?: PoolManagerAdmissionPath | null;
  reviewConfirmations?: ApplicationReviewConfirmations;
}

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
  applicationData: PoolManagerApplicationData;
  admissionPath: PoolManagerAdmissionPath | null;
  paymentStatus: PoolManagerPaymentStatus;
  admissionFeeAmount: number | null;
  strategySubmittedAt: string | null;
  challengeEnrollmentId: string | null;
  challengeTemplateId: string | null;
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
  username: string;
  publicDisplayName: string;
  fullName: string | null;
  showFullName: boolean;
  socialLinks: PmSocialLinks;
  publicSocialLinks: PmSocialLinks;
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
  publicReviewCount: number;
  publicTradeCount: number;
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
