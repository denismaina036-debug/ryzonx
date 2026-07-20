import type { ReturnTier } from "@/features/investor/types/account";
import type { InvestmentCycleStatus } from "@/constants/investment-cycle";
import type { CoverImagePosition } from "@/domain/pools/cover-image-position";

export interface MarketplaceActiveCycle {
  id: string;
  cycleNumber: number;
  name: string;
  status: InvestmentCycleStatus;
  openingDate: string | null;
  closingDate: string | null;
  poolVersion: number;
}

export interface MarketplacePoolCard {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  coverImagePosition: CoverImagePosition | null;
  cardBackgroundColor: string | null;
  categories: string[];
  marketsTraded: string[];
  managerName: string | null;
  managerSlug: string | null;
  managerId: string | null;
  managerVerified: boolean;
  managerPhotoUrl: string | null;
  assetsUnderManagement: number;
  activeInvestors: number;
  monthlyReturnPct: number;
  overallReturnPct: number;
  maxDrawdownPct: number | null;
  securityRating: string | null;
  aggressivenessLevel: string | null;
  poolHealth: string;
  capacityStatus: string;
  minInvestment: number;
  ryvonxRating: number | null;
  featured: boolean;
  listedAt: string | null;
  tradingPair: string;
  tradingStyle: string | null;
  protectionIndicators: string[];
  onProbation: boolean;
  governanceVerified: boolean;
  isRyvonxBacked: boolean;
  investorCapital: number;
  ryvonxCapital: number;
  investorPct: number;
  ryvonxPct: number;
  growthRatePct: number | null;
}

export interface MarketplacePoolDetail extends MarketplacePoolCard {
  description: string;
  poolDescription: string;
  poolDurationDays: number | null;
  suggestedInvestment: number;
  riskSummary: string | null;
  adminComments: string | null;
  targetCapital: number;
  currentCapital: number;
  maxAum: number | null;
  maxInvestorsCap: number | null;
  profitTargetPct: number;
  maxInvestment: number | null;
  returnTiers: ReturnTier[];
  isInviteOnly: boolean;
  suspensionReason: string | null;
  suspendedAt: string | null;
  allocationStatus: string;
  allocationReviewAt: string | null;
  activeCycle: MarketplaceActiveCycle | null;
  canParticipate: boolean;
  manager: PoolManagerPublicSummary | null;
  faq: Array<{ question: string; answer: string }>;
}

export interface PoolManagerPublicSummary {
  id: string;
  slug: string | null;
  displayName: string;
  photoUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  country: string | null;
  markets: string[];
  tradingStyle: string | null;
  tradingSince: string | null;
  isVerified: boolean;
  ryvonxRating: number | null;
  securityRating: number | null;
  aggressivenessRating: number | null;
  winRatePct: number | null;
  avgMonthlyReturnPct: number | null;
  maxDrawdownPct: number | null;
  yearsOnRyvonX: number;
  managerLevel: string | null;
  achievements: Array<{ title: string; awardedAt: string }>;
}

export interface MarketplacePerformanceAnalytics {
  historicalGrowth: Array<{ date: string; poolValue: number; cumulativeRoi: number }>;
  monthlyReturns: Array<{ month: string; roi: number }>;
  weeklyReturnPct: number;
  monthlyReturnPct: number;
  averageReturnPct: number;
  bestMonthPct: number | null;
  worstMonthPct: number | null;
  maxDrawdownPct: number | null;
  avgDrawdownPct: number | null;
  winningMonths: number;
  losingMonths: number;
  totalRoiPct: number;
}

export interface MarketplaceJournalEntry {
  id: string;
  asset: string;
  direction: string;
  entryPrice: number;
  exitPrice: number | null;
  status: string;
  roiPct: number | null;
  date: string;
  notes: string | null;
}

export interface MarketplaceInvestorStats {
  currentInvestors: number;
  totalCapital: number;
  averageInvestment: number;
  largestInvestment: number;
  averageHoldingDays: number | null;
  recentDepositCount: number;
  recentWithdrawalCount: number;
}

export interface MarketplaceActivityItem {
  id: string;
  type: "deposit" | "withdrawal";
  amount: number;
  createdAt: string;
}

export interface MarketplaceFilters {
  search?: string;
  category?: string;
  manager?: string;
  securityRating?: string;
  aggressiveness?: string;
  minInvestmentMax?: number;
  minMonthlyReturn?: number;
  minAum?: number;
  minInvestors?: number;
  market?: string;
  poolHealth?: string;
  capacityStatus?: string;
  sort?: string;
}

export interface FeaturedMarketplaceSection {
  key: string;
  title: string;
  pools: MarketplacePoolCard[];
}

/** Pool Manager–first marketplace card (aggregated from listed pools). */
export interface MarketplaceManagerCard {
  id: string;
  slug: string | null;
  displayName: string;
  photoUrl: string | null;
  country: string | null;
  isVerified: boolean;
  managerLevel: string | null;
  tradingStyle: string | null;
  bio: string | null;
  ryvonxRating: number | null;
  securityRating: string | null;
  aggressivenessLevel: string | null;
  winRatePct: number | null;
  avgMonthlyReturnPct: number | null;
  maxDrawdownPct: number | null;
  yearsOnRyvonX: number | null;
  assetsUnderManagement: number;
  activeInvestors: number;
  poolsManaged: number;
  /** Listed pools — presented as investment opportunities until Strategy/Cycle entities exist. */
  activeOpportunities: MarketplacePoolCard[];
  featuredOpportunity: MarketplacePoolCard | null;
}

export interface FeaturedManagerSection {
  key: string;
  title: string;
  managers: MarketplaceManagerCard[];
}

export interface JoinPoolSummary {
  pool: MarketplacePoolDetail;
  agreementText: string;
}
