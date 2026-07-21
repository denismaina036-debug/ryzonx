import { USER_ROLES, type UserRole } from "@/constants/roles";

/**
 * Core domain types for Ryvonx.
 * Database-generated types live in database.types.ts (generated via Supabase CLI).
 */

// =============================================================================
// User & Auth
// =============================================================================

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
  phone: string | null;
  isActive: boolean;
  emailVerified: boolean;
  registrationIntent?: import("@/constants/registration").RegistrationIntent | null;
  registrationCountry?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: UserProfile;
  accessToken: string;
}

// =============================================================================
// Fund (multi-fund architecture)
// =============================================================================

export interface Fund {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: "active" | "inactive" | "closed";
  isDefault: boolean;
  createdAt: string;
}

export interface FundStats {
  fundId: string;
  totalPoolValue: number;
  totalActiveInvestors: number;
  dailyRoi: number;
  weeklyRoi: number;
  monthlyRoi: number;
  yearlyRoi: number;
  totalClosedTrades: number;
  winRate: number;
  totalDeposits: number;
  totalWithdrawals: number;
  averageInvestment: number;
  largestInvestment: number;
  averageRoi: number;
  updatedAt: string;
}

/** @deprecated Use FundStats instead */
export interface PoolStats {
  totalPoolValue: number;
  totalActiveInvestors: number;
  dailyRoi: number;
  weeklyRoi: number;
  monthlyRoi: number;
  totalClosedTrades: number;
  winRate: number;
  totalDeposits: number;
  totalWithdrawals: number;
  updatedAt: string;
}

export type PerformancePeriod = "daily" | "weekly" | "monthly" | "yearly";

export interface PerformanceSummary {
  fundId: string;
  dailyRoi: number;
  weeklyRoi: number;
  monthlyRoi: number;
  yearlyRoi: number;
  winRate: number;
  averageTradeRoi: number;
  bestMonth: { month: string; roi: number };
  worstMonth: { month: string; roi: number };
  totalTrades: number;
  profitableTrades: number;
}

export interface PerformanceSnapshot {
  id: string;
  fundId: string;
  date: string;
  poolValue: number;
  dailyRoi: number;
  cumulativeRoi: number;
  createdAt: string;
}

export interface Trade {
  id: string;
  fundId: string;
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number | null;
  quantity: number;
  pnl: number | null;
  pnlPercentage: number | null;
  status: TradeStatus;
  openedAt: string;
  closedAt: string | null;
  notes: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export type TradeDirection = "long" | "short";
export type TradeStatus = "open" | "closed" | "cancelled";

export interface JournalEntry {
  id: string;
  tradeId: string | null;
  title: string;
  content: string;
  sentiment: JournalSentiment;
  isPublic: boolean;
  publishedAt: string;
  createdAt: string;
}

export type JournalSentiment = "bullish" | "bearish" | "neutral";

// =============================================================================
// Investor Portfolio
// =============================================================================

export interface InvestorPortfolio {
  userId: string;
  totalInvested: number;
  currentValue: number;
  ownershipPercentage: number;
  unrealizedPnl: number;
  realizedPnl: number;
  totalDeposits: number;
  totalWithdrawals: number;
  lastDepositAt: string | null;
  updatedAt: string;
}

// =============================================================================
// Transactions
// =============================================================================

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  reference: string | null;
  notes: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = "deposit" | "withdrawal" | "adjustment";
export type TransactionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "completed"
  | "cancelled";

// =============================================================================
// Notifications
// =============================================================================

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export type NotificationType =
  | "deposit_approved"
  | "deposit_rejected"
  | "withdrawal_approved"
  | "withdrawal_rejected"
  | "announcement"
  | "performance_update"
  | "system";

// =============================================================================
// Announcements
// =============================================================================

export interface Announcement {
  id: string;
  title: string;
  content: string;
  isPublished: boolean;
  publishedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// FAQ
// =============================================================================

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  rating: number;
  returnRate?: number;
}

export interface ActivityItem {
  id: string;
  fundId: string;
  displayName: string;
  amount: number;
  type: "deposit" | "withdrawal" | "investor";
  createdAt: string;
  /** Whether the investor opted in to show this activity publicly. */
  isPublic: boolean;
}

export interface InvestorStats {
  fundId: string;
  totalActiveInvestors: number;
  totalCapitalInvested: number;
  averageInvestment: number;
  largestInvestment: number;
  averageRoi: number;
  totalDeposits: number;
  totalWithdrawals: number;
}

// =============================================================================
// API Response Types
// =============================================================================

export interface ApiResponse<T> {
  data: T;
  success: true;
}

export interface ApiError {
  error: string;
  code: string;
  success: false;
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// =============================================================================
// Form Types
// =============================================================================

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phone: string;
  country?: string;
  registrationIntent: import("@/constants/registration").RegistrationIntent;
  acceptTerms: boolean;
}

export interface DepositRequestFormData {
  amount: number;
  paymentMethod: string;
  notes?: string;
}

export interface WithdrawalRequestFormData {
  amount: number;
  destinationDetails: string;
  notes?: string;
}

// =============================================================================
// Navigation
// =============================================================================

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  badge?: string | number;
  children?: NavItem[];
  requiresAuth?: boolean;
  requiredRole?: UserRole;
}

// =============================================================================
// Default role for new registrations
// =============================================================================

export const DEFAULT_USER_ROLE = USER_ROLES.INVESTOR;
