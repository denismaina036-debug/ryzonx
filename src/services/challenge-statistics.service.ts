import {
  CHALLENGE_DISPLAY_STATUS,
  type ChallengeConfig,
  type ChallengeDisplayStatus,
  type ChallengeEnrollmentRecord,
  type ChallengeStatistics,
  type ChallengeTrade,
} from "@/domain/challenge/types";

function daysBetween(startIso: string, endDate = new Date()): number {
  const start = new Date(startIso);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
}

function computeMaxDrawdownPct(
  initialBalance: number,
  approvedTrades: ChallengeTrade[]
): number {
  if (approvedTrades.length === 0 || initialBalance <= 0) return 0;

  const sorted = [...approvedTrades].sort(
    (a, b) => new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime()
  );

  let equity = initialBalance;
  let peak = initialBalance;
  let maxDrawdown = 0;

  for (const trade of sorted) {
    equity += trade.profitLoss;
    if (equity > peak) peak = equity;
    const drawdown = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  return maxDrawdown;
}

export function resolveChallengeDisplayStatus(
  enrollment: ChallengeEnrollmentRecord | null,
  applicationRejected?: boolean
): ChallengeDisplayStatus {
  if (applicationRejected) return CHALLENGE_DISPLAY_STATUS.REJECTED;
  if (!enrollment) return CHALLENGE_DISPLAY_STATUS.NONE;

  switch (enrollment.status) {
    case "waiting":
    case "awaiting_setup":
    case "challenge_assigned":
    case "approved":
      return CHALLENGE_DISPLAY_STATUS.WAITING;
    case "active":
      return CHALLENGE_DISPLAY_STATUS.ACTIVE;
    case "completed":
    case "challenge_submitted":
      return CHALLENGE_DISPLAY_STATUS.COMPLETED;
    case "passed":
      return CHALLENGE_DISPLAY_STATUS.PASSED;
    case "failed":
      return CHALLENGE_DISPLAY_STATUS.FAILED;
    case "rejected":
      return CHALLENGE_DISPLAY_STATUS.REJECTED;
    default:
      return CHALLENGE_DISPLAY_STATUS.NONE;
  }
}

export function computeChallengeStatistics(input: {
  challenge: ChallengeConfig;
  enrollment: ChallengeEnrollmentRecord;
  trades: ChallengeTrade[];
}): ChallengeStatistics {
  const { challenge, enrollment, trades } = input;
  const initialBalance = enrollment.account.initialBalance;
  const approved = trades.filter((t) => t.status === "approved");
  const pending = trades.filter((t) => t.status === "pending_review");
  const rejected = trades.filter((t) => t.status === "rejected");

  const currentProfit = approved.reduce((sum, t) => sum + t.profitLoss, 0);
  const profitTargetAmount = initialBalance * (challenge.profitTargetPct / 100);
  const remainingProfitTarget = Math.max(0, profitTargetAmount - currentProfit);
  const currentBalance = initialBalance + currentProfit;

  const uniqueTradingDays = new Set(approved.map((t) => t.tradeDate)).size;
  const currentTradingDay = enrollment.startedAt
    ? daysBetween(enrollment.startedAt)
    : 0;
  const remainingDays = Math.max(0, challenge.durationDays - currentTradingDay);

  const winning = approved.filter((t) => t.profitLoss > 0);
  const losing = approved.filter((t) => t.profitLoss < 0);
  const winRate =
    approved.length > 0 ? (winning.length / approved.length) * 100 : 0;

  const averageWin =
    winning.length > 0
      ? winning.reduce((s, t) => s + t.profitLoss, 0) / winning.length
      : 0;
  const averageLoss =
    losing.length > 0
      ? losing.reduce((s, t) => s + t.profitLoss, 0) / losing.length
      : 0;

  const maxDrawdownPct = computeMaxDrawdownPct(initialBalance, approved);
  const progressPct =
    profitTargetAmount > 0
      ? Math.min(100, Math.max(0, (currentProfit / profitTargetAmount) * 100))
      : 0;

  const profitTargetMet = currentProfit >= profitTargetAmount;
  const minDaysMet = uniqueTradingDays >= challenge.minTradingDays;
  const drawdownWithinLimit = maxDrawdownPct <= challenge.maxOverallLossPct;

  return {
    currentProfit,
    remainingProfitTarget,
    profitTargetAmount,
    currentBalance,
    initialBalance,
    tradingDays: uniqueTradingDays,
    currentTradingDay,
    remainingDays,
    minTradingDays: challenge.minTradingDays,
    tradesSubmitted: trades.length,
    tradesApproved: approved.length,
    tradesRejected: rejected.length,
    tradesPending: pending.length,
    winningTrades: winning.length,
    losingTrades: losing.length,
    winRate,
    averageWin,
    averageLoss,
    totalApprovedTrades: approved.length,
    maxDrawdownPct,
    progressPct,
    profitTargetMet,
    minDaysMet,
    drawdownWithinLimit,
  };
}

export function isChallengeCriteriaMet(stats: ChallengeStatistics): boolean {
  return stats.profitTargetMet && stats.minDaysMet && stats.drawdownWithinLimit;
}
