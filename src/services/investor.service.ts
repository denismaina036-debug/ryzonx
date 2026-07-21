import { createClient } from "@/lib/supabase/server";
import { DEFAULT_FUND_ID } from "@/constants/funds";
import { requireAuth } from "@/lib/auth/session";
import {
  resolvePoolManagerPublicLabel,
  resolvePublicManagerName,
  managerRowToIdentity,
} from "@/domain/pool-manager/public-profile";
import type { Tables } from "@/types/database.types";
import type {
  InvestorDashboardPageData,
  InvestorDashboardTrade,
  InvestorPoolActivityItem,
  InvestorPoolPerformance,
  InvestorTradeDisplayStatus,
  TraderChallenge,
  ChallengeEnrollment,
} from "@/features/investor/types";
import { walletService } from "@/services/wallet.service";

type TradeSnapshot = Pick<
  Tables<"trades">,
  | "id"
  | "symbol"
  | "direction"
  | "entry_price"
  | "exit_price"
  | "current_price"
  | "invested_amount"
  | "pnl"
  | "investor_status"
  | "status"
  | "chart_screenshot_url"
  | "opened_at"
  | "updated_at"
  | "published_at"
>;

type TransactionSnapshot = Pick<
  Tables<"transactions">,
  "id" | "type" | "amount" | "status" | "created_at" | "user_id"
>;

type RankSnapshot = Pick<Tables<"investor_portfolios">, "user_id" | "total_invested">;

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function mapTradeStatus(raw: string | null): InvestorTradeDisplayStatus {
  const map: Record<string, InvestorTradeDisplayStatus> = {
    running: "running",
    breakeven: "breakeven",
    partials_taken: "partials_taken",
    take_profit_hit: "take_profit_hit",
    stop_loss_hit: "stop_loss_hit",
    closed: "closed",
    cancelled: "cancelled",
    open: "running",
    canceled: "cancelled",
  };
  return map[raw ?? ""] ?? "running";
}

function mapTradeRow(row: TradeSnapshot): InvestorDashboardTrade {
  const current =
    row.current_price != null
      ? toNumber(row.current_price)
      : row.exit_price != null
        ? toNumber(row.exit_price)
        : toNumber(row.entry_price);

  return {
    id: row.id,
    asset: row.symbol,
    direction: row.direction === "short" ? "short" : "long",
    entryPrice: toNumber(row.entry_price),
    currentPrice: current,
    investedAmount: toNumber(row.invested_amount),
    profitLoss: toNumber(row.pnl),
    status: mapTradeStatus(row.investor_status ?? row.status),
    isActive: row.status === "open",
    chartScreenshotUrl: row.chart_screenshot_url ?? null,
    openedAt: row.opened_at,
  };
}

function mapPoolHealth(
  value: string | null | undefined
): InvestorPoolPerformance["poolHealth"] {
  if (value === "healthy" || value === "watch" || value === "at_risk") {
    return value;
  }
  return null;
}

function emptyPoolPerformance(): InvestorPoolPerformance {
  return {
    totalPoolBalance: 0,
    totalProfit: 0,
    totalProfitPct: 0,
    totalContributors: 0,
    investorRank: 0,
    rankPercentile: 0,
    clientSharePct: 0,
    poolName: null,
    managerName: null,
    managerPhotoUrl: null,
    managerRating: null,
    poolHealth: null,
    myInvestment: 0,
    dailyProfit: 0,
    winRate: null,
    profitFactor: null,
    maxDrawdownPct: null,
    bestDayProfit: null,
  };
}

async function fetchListedFundIds(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string[]> {
  const { data } = await supabase
    .from("funds")
    .select("id")
    .eq("is_marketplace_listed", true)
    .in("lifecycle_status", ["live", "approved"])
    .eq("status", "active");

  return (data ?? []).map((row) => (row as { id: string }).id);
}

async function fetchPublishedPoolTrades(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fundIds: string[],
  limit = 20
): Promise<InvestorDashboardTrade[]> {
  if (fundIds.length === 0) return [];

  const { data } = await supabase
    .from("trades")
    .select(
      "id, symbol, direction, entry_price, exit_price, current_price, invested_amount, pnl, investor_status, status, chart_screenshot_url, opened_at, updated_at, published_at"
    )
    .in("fund_id", fundIds)
    .neq("status", "cancelled")
    .or("published_at.not.is.null,status.eq.open")
    .order("updated_at", { ascending: false })
    .limit(limit);

  return ((data ?? []) as TradeSnapshot[]).map(mapTradeRow);
}

export const investorService = {
  async getDashboardPageData(): Promise<InvestorDashboardPageData> {
    const user = await requireAuth();
    const supabase = await createClient();
    const walletSummary = await walletService.getWalletSummary();

    const primary = walletSummary.participations[0] ?? null;
    const primaryFundId = primary?.fundId ?? null;
    const myInvestment = walletSummary.participations.reduce(
      (sum, p) => sum + p.amountInvested,
      0
    );
    const totalProfit = walletSummary.poolProfit;
    const listedFundIds = await fetchListedFundIds(supabase);
    const tradeFundIds = [
      ...new Set([
        ...walletSummary.participations.map((p) => p.fundId),
        ...listedFundIds,
      ]),
    ];

    const [
      fundResult,
      poolResult,
      tradesResult,
      activityResult,
      challengeResult,
      enrollmentResult,
      notificationsResult,
      rankResult,
    ] = await Promise.all([
      primaryFundId
        ? supabase
            .from("funds")
            .select(
              "id, name, pool_value, pool_health, pool_manager_name, pool_manager_id, ryvonx_rating, current_roi, active_investors, pool_managers(username, slug, display_name, show_full_name, profile_photo_url, icon_url)"
            )
            .eq("id", primaryFundId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      primaryFundId
        ? supabase
            .from("pool_stats")
            .select(
              "total_pool_value, total_active_investors, daily_roi, monthly_roi, win_rate"
            )
            .eq("fund_id", primaryFundId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      tradeFundIds.length > 0
        ? supabase
            .from("trades")
            .select(
              "id, symbol, direction, entry_price, exit_price, current_price, invested_amount, pnl, investor_status, status, chart_screenshot_url, opened_at, updated_at, published_at"
            )
            .in("fund_id", tradeFundIds)
            .neq("status", "cancelled")
            .or("published_at.not.is.null,status.eq.open")
            .order("updated_at", { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("transactions")
        .select("id, type, amount, status, created_at, user_id")
        .eq("user_id", user.id)
        .in("status", ["approved", "completed", "pending"])
        .in("type", ["deposit", "withdrawal"])
        .order("created_at", { ascending: false })
        .limit(15),
      supabase
        .from("trader_challenges")
        .select("*")
        .eq("fund_id", DEFAULT_FUND_ID)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("trader_challenge_enrollments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false),
      primaryFundId
        ? supabase
            .from("investor_portfolios")
            .select("user_id, total_invested")
            .eq("fund_id", primaryFundId)
            .order("total_invested", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    const fund = fundResult.data as {
      id: string;
      name: string;
      pool_value: number;
      pool_health: string;
      pool_manager_name: string | null;
      pool_manager_id: string | null;
      ryvonx_rating: number | null;
      current_roi: number;
      active_investors: number;
      pool_managers:
        | {
            username?: string | null;
            slug?: string | null;
            display_name: string;
            show_full_name?: boolean | null;
            profile_photo_url: string | null;
            icon_url: string | null;
          }
        | {
            username?: string | null;
            slug?: string | null;
            display_name: string;
            show_full_name?: boolean | null;
            profile_photo_url: string | null;
            icon_url: string | null;
          }[]
        | null;
    } | null;

    const managerJoin = fund?.pool_managers;
    const managerIdentityRow = Array.isArray(managerJoin) ? managerJoin[0] : managerJoin;
    const managerPhotoUrl =
      managerIdentityRow?.profile_photo_url ?? managerIdentityRow?.icon_url ?? null;
    const managerName = managerIdentityRow
      ? resolvePoolManagerPublicLabel(managerRowToIdentity(managerIdentityRow))
      : resolvePublicManagerName(null, fund?.pool_manager_name ?? null);

    const pool = poolResult.data as {
      total_pool_value: number;
      total_active_investors: number;
      daily_roi: number;
      monthly_roi: number;
      win_rate: number;
    } | null;

    const poolBalance =
      toNumber(pool?.total_pool_value) || toNumber(fund?.pool_value);
    const sharePct =
      poolBalance > 0 && myInvestment > 0
        ? (myInvestment / poolBalance) * 100
        : 0;
    const totalProfitPct =
      myInvestment > 0 ? (totalProfit / myInvestment) * 100 : 0;
    const dailyRoi = toNumber(pool?.daily_roi);
    const dailyProfit =
      myInvestment > 0 ? (myInvestment * dailyRoi) / 100 : 0;

    const rankRows = (rankResult.data ?? []) as RankSnapshot[];
    const rankIndex = rankRows.findIndex((r) => r.user_id === user.id);
    const investorRank = rankIndex >= 0 ? rankIndex + 1 : 0;
    const rankPercentile =
      rankRows.length > 0 && investorRank > 0
        ? Number(((investorRank / rankRows.length) * 100).toFixed(2))
        : 0;

    const recentTrades = ((tradesResult.data ?? []) as TradeSnapshot[])
      .map(mapTradeRow)
      .slice(0, 5);

    let recentActivity: InvestorPoolActivityItem[] = [];
    const activityRows = (activityResult.data ?? []) as TransactionSnapshot[];
    if (activityRows.length > 0) {
      recentActivity = activityRows.map((tx) => ({
        id: tx.id,
        investorName: "You",
        action:
          tx.type === "withdrawal"
            ? ("withdrew" as const)
            : ("deposited" as const),
        amount: toNumber(tx.amount),
        createdAt: tx.created_at,
      }));
    }

    let challenge: TraderChallenge | null = null;
    const challengeRow = challengeResult.data as Tables<"trader_challenges"> | null;
    if (challengeRow) {
      challenge = {
        id: challengeRow.id,
        title: challengeRow.title,
        description: challengeRow.description,
        price: toNumber(challengeRow.price),
        profitTargetPct: toNumber(challengeRow.profit_target_pct),
        maxDailyLossPct: challengeRow.max_daily_loss_pct
          ? toNumber(challengeRow.max_daily_loss_pct)
          : null,
        maxOverallLossPct: toNumber(challengeRow.max_overall_loss_pct),
        durationDays: challengeRow.duration_days,
        rulesSummary: challengeRow.rules_summary ?? "",
        buttonText: challengeRow.button_text,
        isActive: challengeRow.is_active,
      };
    }

    let challengeEnrollment: ChallengeEnrollment | null = null;
    if (!enrollmentResult.error && enrollmentResult.data) {
      const enrollmentRow =
        enrollmentResult.data as Tables<"trader_challenge_enrollments">;
      challengeEnrollment = {
        id: enrollmentRow.id,
        challengeId: enrollmentRow.challenge_id,
        status: enrollmentRow.status as ChallengeEnrollment["status"],
        paymentMethod:
          enrollmentRow.payment_method === "balance" ||
          enrollmentRow.payment_method === "crypto"
            ? enrollmentRow.payment_method
            : null,
        amountPaid:
          enrollmentRow.amount_paid != null
            ? toNumber(enrollmentRow.amount_paid)
            : null,
        challengeAccountDetails: enrollmentRow.challenge_account_details,
        adminRules: enrollmentRow.admin_rules,
      };
    }

    const poolPerformance: InvestorPoolPerformance = primaryFundId
      ? {
          totalPoolBalance: poolBalance,
          totalProfit,
          totalProfitPct,
          totalContributors:
            toNumber(pool?.total_active_investors) ||
            toNumber(fund?.active_investors),
          investorRank,
          rankPercentile,
          clientSharePct: sharePct,
          poolName: fund?.name ?? primary?.poolName ?? null,
          managerName,
          managerPhotoUrl,
          managerRating:
            fund?.ryvonx_rating != null ? toNumber(fund.ryvonx_rating) : null,
          poolHealth: mapPoolHealth(fund?.pool_health),
          myInvestment,
          dailyProfit,
          winRate: pool?.win_rate != null ? toNumber(pool.win_rate) : null,
          profitFactor: null,
          maxDrawdownPct: null,
          bestDayProfit: dailyProfit !== 0 ? Math.abs(dailyProfit) : null,
        }
      : emptyPoolPerformance();

    return {
      investment: walletSummary,
      poolPerformance,
      recentTrades,
      recentActivity,
      challenge,
      challengeEnrollment,
      unreadNotifications: notificationsResult.count ?? 0,
    };
  },

  async getTradesPageData(): Promise<{
    runningTrades: InvestorDashboardTrade[];
    closedTrades: InvestorDashboardTrade[];
  }> {
    await requireAuth();
    const supabase = await createClient();
    const wallet = await walletService.getWalletSummary();
    const listedFundIds = await fetchListedFundIds(supabase);
    const fundIds = [
      ...new Set([...wallet.participations.map((p) => p.fundId), ...listedFundIds]),
    ];

    const trades = await fetchPublishedPoolTrades(supabase, fundIds, 100);

    return {
      runningTrades: trades.filter((t) => t.isActive),
      closedTrades: trades.filter((t) => !t.isActive),
    };
  },

  /** @deprecated Use getDashboardPageData */
  async getDashboardData() {
    const data = await this.getDashboardPageData();
    return {
      portfolio: {
        fundId: DEFAULT_FUND_ID,
        totalInvested: data.investment.participations.reduce(
          (s, p) => s + p.amountInvested,
          0
        ),
        currentValue:
          data.investment.balance +
          data.investment.participations.reduce((s, p) => s + p.currentValue, 0),
        ownershipPercentage: data.poolPerformance.clientSharePct,
        unrealizedPnl: data.poolPerformance.totalProfit,
        realizedPnl: data.investment.poolProfit,
        totalDeposits: data.investment.participations.reduce(
          (s, p) => s + p.amountInvested,
          0
        ),
        totalWithdrawals: 0,
        lastDepositAt: null,
      },
      poolStats: {
        totalPoolValue: data.poolPerformance.totalPoolBalance,
        totalActiveInvestors: data.poolPerformance.totalContributors,
        dailyRoi: data.poolPerformance.totalProfitPct,
        monthlyRoi: 0,
        winRate: data.poolPerformance.winRate ?? 0,
      },
    };
  },
};

export type { InvestorDashboardPageData };
