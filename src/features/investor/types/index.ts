/** Investor-facing trade display status (admin-controlled). */
export type InvestorTradeDisplayStatus =
  | "running"
  | "breakeven"
  | "partials_taken"
  | "take_profit_hit"
  | "stop_loss_hit"
  | "closed"
  | "cancelled";

export interface InvestorInvestmentSummary {
  balance: number;
  poolProfit: number;
  participations: import("@/features/investor/types/wallet").WalletPoolParticipation[];
}

export type {
  WalletPoolParticipation,
  InvestorTransaction,
} from "@/features/investor/types/wallet";

export interface InvestorPoolPerformance {
  totalPoolBalance: number;
  totalProfit: number;
  totalProfitPct: number;
  totalContributors: number;
  investorRank: number;
  rankPercentile: number;
  clientSharePct: number;
  poolName?: string | null;
  managerName?: string | null;
  managerPhotoUrl?: string | null;
  managerRating?: number | null;
  poolHealth?: "healthy" | "watch" | "at_risk" | null;
  myInvestment?: number | null;
  /** Estimated profit since previous day from pool daily ROI × invested capital */
  dailyProfit?: number;
  winRate?: number | null;
  profitFactor?: number | null;
  maxDrawdownPct?: number | null;
  bestDayProfit?: number | null;
}

export interface InvestorDashboardTrade {
  id: string;
  asset: string;
  direction: "long" | "short";
  entryPrice: number;
  currentPrice: number;
  investedAmount: number;
  profitLoss: number;
  status: InvestorTradeDisplayStatus;
  isActive: boolean;
  chartScreenshotUrl: string | null;
  openedAt: string;
}

export interface InvestorPoolActivityItem {
  id: string;
  investorName: string;
  action: "deposited" | "withdrew";
  amount: number;
  createdAt: string;
}

export interface TraderChallenge {
  id: string;
  title: string;
  description: string;
  price: number;
  profitTargetPct: number;
  maxDailyLossPct: number | null;
  maxOverallLossPct: number;
  durationDays: number;
  rulesSummary: string;
  buttonText: string;
  isActive: boolean;
}

export type ChallengeEnrollmentStatus =
  | "pending_payment"
  | "paid"
  | "awaiting_setup"
  | "active"
  | "completed"
  | "cancelled";

export interface ChallengeEnrollment {
  id: string;
  challengeId: string;
  status: ChallengeEnrollmentStatus;
  paymentMethod: "balance" | "crypto" | null;
  amountPaid: number | null;
  challengeAccountDetails: string | null;
  adminRules: string | null;
}

export interface InvestorDashboardPageData {
  investment: InvestorInvestmentSummary;
  poolPerformance: InvestorPoolPerformance;
  recentTrades: InvestorDashboardTrade[];
  recentActivity: InvestorPoolActivityItem[];
  challenge: TraderChallenge | null;
  challengeEnrollment: ChallengeEnrollment | null;
  unreadNotifications: number;
}
