import type {
  TransactionStatus,
  TransactionType,
  TradeStatus,
  UserProfile,
} from "@/types";

export type AccountStatus = "active" | "suspended" | "frozen";

export interface AdminDashboardStats {
  totalPoolValue: number;
  activeInvestors: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  dailyRoi: number;
  monthlyRoi: number;
  assetsUnderManagement: number;
  totalDeposits: number;
  totalWithdrawals: number;
  activeTrades: number;
  closedTrades: number;
  winRate: number;
}

export interface AdminTrendPoint {
  date: string;
  value: number;
}

export interface AdminDepositRequest {
  id: string;
  investorId: string;
  investorName: string;
  investorEmail: string;
  fundId: string;
  fundName: string;
  amount: number;
  paymentMethod: string;
  reference: string | null;
  paymentProof: string | null;
  notes: string | null;
  adminNotes: string | null;
  status: TransactionStatus;
  submittedAt: string;
  processedAt: string | null;
  approvedBy: string | null;
}

export interface AdminWithdrawalRequest {
  id: string;
  investorId: string;
  investorName: string;
  investorEmail: string;
  fundId: string;
  fundName: string;
  amount: number;
  withdrawableBalance: number;
  destination: string;
  notes: string | null;
  adminNotes: string | null;
  status: TransactionStatus;
  submittedAt: string;
  processedAt: string | null;
  approvedBy: string | null;
}

export interface AdminInvestor {
  profile: UserProfile;
  fundId: string;
  fundName: string;
  accountStatus: AccountStatus;
  totalInvested: number;
  currentValue: number;
  ownershipPercentage: number;
  totalDeposits: number;
  totalWithdrawals: number;
  roi: number;
  showActivityPublicly: boolean;
  lastActiveAt: string;
}

export interface AdminFund {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: "active" | "inactive" | "closed" | "paused" | "archived";
  isDefault: boolean;
  minInvestment: number;
  maxInvestment: number | null;
  poolValue: number;
  assetsUnderManagement: number;
  activeInvestors: number;
  currentRoi: number;
  createdAt: string;
  poolDescription: string;
  tradingPair: string;
  poolDurationDays: number | null;
  targetCapital: number;
  profitTargetPct: number;
  targetInvestors: number;
  returnTiers: Array<{ minAmount: number; maxAmount: number | null; returnPct: number }>;
  isInviteOnly: boolean;
  currentCapital: number;
  cardBackgroundColor: string | null;
  poolManagerName: string | null;
  poolManagerIconUrl: string | null;
  canDelete: boolean;
  isMarketplaceListed: boolean;
  featured: boolean;
  tagline: string | null;
  categories: string[];
  securityRating: string | null;
  aggressivenessLevel: string | null;
  poolHealth: string;
  capacityStatus: string;
  ryvonxRating: number | null;
  suggestedInvestment: number | null;
  riskSummary: string | null;
  adminComments: string | null;
  coverImageUrl: string | null;
  logoUrl: string | null;
  lifecycleStatus: string;
  maxAum: number | null;
  maxInvestorsCap: number | null;
}

export interface AdminTrade {
  id: string;
  fundId: string;
  fundName: string;
  symbol: string;
  direction: "long" | "short";
  entryPrice: number;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  quantity: number;
  pnl: number | null;
  pnlPercentage: number | null;
  status: TradeStatus;
  openedAt: string;
  closedAt: string | null;
  notes: string | null;
  publishedAt: string | null;
  screenshotUrl: string | null;
}

export interface DailyFundSnapshot {
  id: string;
  fundId: string;
  fundName: string;
  date: string;
  openingPoolValue: number;
  closingPoolValue: number;
  dailyRoi: number;
  dailyProfitLoss: number;
  tradesCount: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  depositsReceived: number;
  withdrawalsProcessed: number;
  activeInvestors: number;
  assetsUnderManagement: number;
  managerNotes: string | null;
  isLocked: boolean;
  createdAt: string;
}

export interface AdminTransaction {
  id: string;
  investorName: string;
  fundName: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  reference: string | null;
  createdAt: string;
  processedAt: string | null;
}

export interface AuditLogEntry {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  createdAt: string;
}

export interface AdminAnnouncement {
  id: string;
  title: string;
  content: string;
  fundName: string;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
}

export interface AdminTestimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  rating: number;
  returnRate: number | null;
  isPublished: boolean;
}

export interface PlatformSetting {
  key: string;
  label: string;
  value: string;
  group: string;
}
