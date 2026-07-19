export const CHALLENGE_DISPLAY_STATUS = {
  WAITING: "waiting",
  ACTIVE: "active",
  COMPLETED: "completed",
  PASSED: "passed",
  FAILED: "failed",
  REJECTED: "rejected",
  NONE: "none",
} as const;

export type ChallengeDisplayStatus =
  (typeof CHALLENGE_DISPLAY_STATUS)[keyof typeof CHALLENGE_DISPLAY_STATUS];

export const CHALLENGE_TRADE_STATUS = {
  PENDING_REVIEW: "pending_review",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type ChallengeTradeStatus =
  (typeof CHALLENGE_TRADE_STATUS)[keyof typeof CHALLENGE_TRADE_STATUS];

export const CHALLENGE_TRADE_DIRECTION = {
  BUY: "buy",
  SELL: "sell",
} as const;

export type ChallengeTradeDirection =
  (typeof CHALLENGE_TRADE_DIRECTION)[keyof typeof CHALLENGE_TRADE_DIRECTION];

export const CHALLENGE_TRADE_SOURCE = {
  MANUAL: "manual",
  MT5: "mt5",
} as const;

export type ChallengeTradeSource =
  (typeof CHALLENGE_TRADE_SOURCE)[keyof typeof CHALLENGE_TRADE_SOURCE];

export interface ChallengeAccountInfo {
  broker: string | null;
  server: string | null;
  login: string | null;
  initialBalance: number;
  notes: string | null;
}

export interface ChallengeConfig {
  id: string;
  title: string;
  profitTargetPct: number;
  maxOverallLossPct: number;
  maxDailyLossPct: number | null;
  minTradingDays: number;
  durationDays: number;
  rulesSummary: string | null;
  tradingRules: string | null;
}

export interface ChallengeEnrollmentRecord {
  id: string;
  challengeId: string;
  userId: string;
  applicationId: string | null;
  status: string;
  startedAt: string | null;
  account: ChallengeAccountInfo;
}

export interface ChallengeTrade {
  id: string;
  enrollmentId: string;
  userId: string;
  tradingDay: number;
  tradeDate: string;
  instrument: string;
  market: string | null;
  direction: ChallengeTradeDirection;
  entryPrice: number;
  exitPrice: number;
  lotSize: number;
  profitLoss: number;
  notes: string | null;
  screenshotUrl: string | null;
  status: ChallengeTradeStatus;
  rejectionReason: string | null;
  reviewNotes: string | null;
  source: ChallengeTradeSource;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeStatistics {
  currentProfit: number;
  remainingProfitTarget: number;
  profitTargetAmount: number;
  currentBalance: number;
  initialBalance: number;
  tradingDays: number;
  currentTradingDay: number;
  remainingDays: number;
  minTradingDays: number;
  tradesSubmitted: number;
  tradesApproved: number;
  tradesRejected: number;
  tradesPending: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  totalApprovedTrades: number;
  maxDrawdownPct: number;
  progressPct: number;
  profitTargetMet: boolean;
  minDaysMet: boolean;
  drawdownWithinLimit: boolean;
}

export interface ChallengeCenterState {
  displayStatus: ChallengeDisplayStatus;
  canStart: boolean;
  canSubmitTrades: boolean;
  applicationId: string | null;
  enrollment: ChallengeEnrollmentRecord | null;
  challenge: ChallengeConfig | null;
  statistics: ChallengeStatistics | null;
  trades: ChallengeTrade[];
}

export interface CreateChallengeTradeInput {
  tradingDay: number;
  tradeDate: string;
  instrument: string;
  market?: string;
  direction: ChallengeTradeDirection;
  entryPrice: number;
  exitPrice: number;
  lotSize: number;
  profitLoss: number;
  notes?: string;
  screenshotUrl?: string;
}

export type UpdateChallengeTradeInput = Partial<CreateChallengeTradeInput>;

export interface ProvisionChallengeAccountInput {
  applicationId: string;
  userId: string;
  broker: string;
  server: string;
  login: string;
  initialBalance: number;
  notes?: string;
}
