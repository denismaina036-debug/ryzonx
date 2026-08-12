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
  TraderChallenge,
  ChallengeEnrollment,
} from "@/features/investor/types";
import type { WalletPoolParticipation } from "@/features/investor/types/wallet";
import { walletService } from "@/services/wallet.service";
import { investorPoolTradesService } from "@/services/investor-pool-trades.service";
import { investmentCycleService } from "@/services/investment-cycle.service";
import {
  computeInvestorOwnershipShare,
  RAISED_CAPITAL_ALLOCATION_STATUSES,
} from "@/domain/investment/cycle-metrics";
import type { InvestmentAllocationStatus } from "@/constants/investment-allocation";
import { mapRawTransactionToActivityItem, type RawTransactionRow } from "@/lib/transaction/map";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePublicDisplayCount } from "@/features/marketplace/utils/marketplace-pool-card-presentation";
import { computeLifetimePoolPerformance } from "@/lib/investor/lifetime-pool-performance";

const ACTIVITY_SELECT_WITH_METADATA =
  "id, fund_id, type, amount, status, payment_method, reference, transaction_reference, notes, destination, crypto_symbol, crypto_network, crypto_amount, metadata, created_at, user_id";

const ACTIVITY_SELECT_BASIC =
  "id, fund_id, type, amount, status, payment_method, reference, transaction_reference, notes, destination, crypto_symbol, crypto_network, crypto_amount, created_at, user_id";

async function fetchRecentActivityRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const withMetadata = await supabase
    .from("transactions")
    .select(ACTIVITY_SELECT_WITH_METADATA)
    .eq("user_id", userId)
    .in("status", ["approved", "completed", "pending"])
    .order("created_at", { ascending: false })
    .limit(15);

  if (!withMetadata.error) {
    return withMetadata.data ?? [];
  }

  const missingMetadata =
    withMetadata.error.message.includes("metadata") ||
    withMetadata.error.message.includes("schema cache");

  if (!missingMetadata) {
    throw new Error(withMetadata.error.message);
  }

  const basic = await supabase
    .from("transactions")
    .select(ACTIVITY_SELECT_BASIC)
    .eq("user_id", userId)
    .in("status", ["approved", "completed", "pending"])
    .order("created_at", { ascending: false })
    .limit(15);

  if (basic.error) {
    throw new Error(basic.error.message);
  }

  return basic.data ?? [];
}
import type { InvestorPoolParticipationView } from "@/domain/investment/investor-pool-participation";
import {
  resolveInvestorDisplayCapital,
  resolvePostCycleCapitalAmount,
  resolvePostCycleProfitAmount,
  shouldShowPostCycleChoices,
} from "@/domain/investment/investor-pool-participation";
import type { CycleInvestorSettlement } from "@/services/investment-engine/cycle-investor-settlement.service";
import { cycleInvestorSettlementService } from "@/services/investment-engine/cycle-investor-settlement.service";

type RankSnapshot = Pick<Tables<"investor_portfolios">, "user_id" | "total_invested">;

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function mapPoolHealth(
  value: string | null | undefined
): InvestorPoolPerformance["poolHealth"] {
  if (value === "healthy" || value === "watch" || value === "at_risk") {
    return value;
  }
  return null;
}

/** Total capital raised in the pool — live totals with optional admin display seed. */
function resolvePoolRaisedCapital(input: {
  cycleRaisedCapital?: number | null;
  portfolioInvestedTotal: number;
  investorCapital?: number | null;
  currentCapital?: number | null;
  displayRaisedCapital?: number | null;
  poolStatsValue?: number | null;
  fundPoolValue?: number | null;
}): number {
  const liveRaised = Math.max(
    input.cycleRaisedCapital ?? 0,
    input.portfolioInvestedTotal,
    toNumber(input.investorCapital),
    toNumber(input.currentCapital)
  );

  const seedRaised = toNumber(input.displayRaisedCapital);
  if (seedRaised > 0 || liveRaised > 0) {
    return resolvePublicDisplayCount(seedRaised, liveRaised);
  }

  return toNumber(input.poolStatsValue) || toNumber(input.fundPoolValue);
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
  _supabase: Awaited<ReturnType<typeof createClient>>,
  fundIds: string[],
  limit = 20
): Promise<InvestorDashboardTrade[]> {
  return investorPoolTradesService.listForFunds(fundIds, limit);
}

export const investorService = {
  async getDashboardPageData(): Promise<InvestorDashboardPageData> {
    const user = await requireAuth();
    const supabase = await createClient();
    const { profitDistributionService } = await import(
      "@/services/profit-distribution.service"
    );
    await profitDistributionService.backfillInvestorCycleProfitActivities(user.id).catch(
      () => undefined
    );
    const walletSummary = await walletService.getWalletSummary();

    const primary = walletSummary.participations[0] ?? null;
    const primaryFundId = primary?.fundId ?? null;
    const primaryMyInvestment = primary?.amountInvested ?? 0;
    const totalInvestedAcrossPools = walletSummary.participations.reduce(
      (sum, p) => sum + p.amountInvested,
      0
    );
    const participationFundIds = walletSummary.participations.map((p) => p.fundId);
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
      journalTrades,
      activityResult,
      challengeResult,
      enrollmentResult,
      notificationsResult,
      rankResult,
      activeCycle,
      poolInvestedTotal,
      lifetimeProfitRows,
    ] = await Promise.all([
      primaryFundId
        ? supabase
            .from("funds")
            .select(
              "id, name, pool_value, current_capital, investor_capital, display_raised_capital, pool_health, pool_manager_name, pool_manager_id, ryvonx_rating, current_roi, active_investors, pool_managers(username, slug, display_name, show_full_name, profile_photo_url, icon_url)"
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
        ? investorPoolTradesService.listForFunds(tradeFundIds, 20)
        : Promise.resolve([]),
      fetchRecentActivityRows(supabase, user.id),
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
      primaryFundId
        ? investmentCycleService.getActiveForFund(primaryFundId)
        : Promise.resolve(null),
      primaryFundId
        ? (async () => {
            const admin = createAdminClient();
            const { data } = await admin
              .from("investor_portfolios")
              .select("total_invested")
              .eq("fund_id", primaryFundId)
              .gt("total_invested", 0);
            return ((data ?? []) as Array<{ total_invested: number | string }>).reduce(
              (sum, row) => sum + toNumber(row.total_invested),
              0
            );
          })()
        : Promise.resolve(0),
      participationFundIds.length > 0
        ? (async () => {
            const admin = createAdminClient();
            const { data } = await admin
              .from("transactions")
              .select("amount, created_at")
              .eq("user_id", user.id)
              .eq("status", "completed")
              .in("payment_method", ["cycle_profit", "trade_profit"])
              .in("fund_id", participationFundIds);
            return (data ?? []) as Array<{ amount: number | string; created_at: string }>;
          })()
        : Promise.resolve([]),
    ]);

    const fund = fundResult.data as {
      id: string;
      name: string;
      pool_value: number;
      current_capital: number | null;
      investor_capital: number | null;
      display_raised_capital: number | null;
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

    const rankRows = (rankResult.data ?? []) as RankSnapshot[];

    const poolBalance = resolvePoolRaisedCapital({
      cycleRaisedCapital: activeCycle?.raisedCapital,
      portfolioInvestedTotal: poolInvestedTotal,
      investorCapital: fund?.investor_capital,
      currentCapital: fund?.current_capital,
      displayRaisedCapital: fund?.display_raised_capital,
      poolStatsValue: pool?.total_pool_value,
      fundPoolValue: fund?.pool_value,
    });

    let sharePct = 0;
    if (primaryFundId) {
      if (poolBalance > 0 && primaryMyInvestment > 0) {
        sharePct = (primaryMyInvestment / poolBalance) * 100;
      } else if (activeCycle?.targetCapital && activeCycle.targetCapital > 0) {
        const { data: allocationRow } = await supabase
          .from("investment_allocations")
          .select("amount, status")
          .eq("investor_id", user.id)
          .eq("investment_cycle_id", activeCycle.id)
          .maybeSingle();

        const allocation = allocationRow as { amount: number | string; status: string } | null;
        const confirmedAllocation =
          allocation &&
          RAISED_CAPITAL_ALLOCATION_STATUSES.includes(
            allocation.status as InvestmentAllocationStatus
          )
            ? toNumber(allocation.amount)
            : null;

        const investmentBasis = confirmedAllocation ?? primaryMyInvestment;
        sharePct =
          computeInvestorOwnershipShare(investmentBasis, activeCycle.targetCapital) ?? 0;
      }
    } else if (poolBalance > 0 && primaryMyInvestment > 0) {
      sharePct = (primaryMyInvestment / poolBalance) * 100;
    }

    const lifetimePerformance = computeLifetimePoolPerformance(
      lifetimeProfitRows,
      totalInvestedAcrossPools
    );
    const performanceProfit = lifetimePerformance.lifetimeProfit;
    const performanceProfitPct = lifetimePerformance.lifetimeProfitPct;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const adminClient = createAdminClient();
    const { data: todayProfitRows } = await adminClient
      .from("transactions")
      .select("amount, fund_id")
      .eq("user_id", user.id)
      .eq("payment_method", "cycle_profit")
      .eq("status", "completed")
      .gte("created_at", todayStart.toISOString());

    let dailyProfit = 0;
    for (const row of (todayProfitRows ?? []) as Array<{ amount: number | string; fund_id: string }>) {
      if (!primaryFundId || row.fund_id === primaryFundId) {
        dailyProfit += toNumber(row.amount);
      }
    }

    const rankIndex = rankRows.findIndex((r) => r.user_id === user.id);
    const investorRank = rankIndex >= 0 ? rankIndex + 1 : 0;
    const rankPercentile =
      rankRows.length > 0 && investorRank > 0
        ? Number(((investorRank / rankRows.length) * 100).toFixed(2))
        : 0;

    const recentTrades = journalTrades;

    let recentActivity: InvestorPoolActivityItem[] = [];
    const activityRows = activityResult as RawTransactionRow[];
    if (activityRows.length > 0) {
      const activityFundIds = [...new Set(activityRows.map((row) => row.fund_id))];
      const admin = createAdminClient();
      const { data: activityFunds } = await admin
        .from("funds")
        .select("id, name")
        .in("id", activityFundIds);
      const activityFundMap = new Map(
        ((activityFunds ?? []) as Array<{ id: string; name: string }>).map((fund) => [
          fund.id,
          fund.name,
        ])
      );

      recentActivity = activityRows.map((tx) =>
        mapRawTransactionToActivityItem(tx, activityFundMap.get(tx.fund_id) ?? "—")
      );
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
          totalProfit: performanceProfit,
          totalProfitPct: performanceProfitPct,
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
          myInvestment: primaryMyInvestment,
          dailyProfit,
          winRate: pool?.win_rate != null ? toNumber(pool.win_rate) : null,
          profitFactor: null,
          maxDrawdownPct: null,
          bestDayProfit:
            lifetimePerformance.bestDayProfit ??
            (dailyProfit !== 0 ? dailyProfit : performanceProfit > 0 ? performanceProfit : null),
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

  async getInvestmentsPageData(): Promise<{
    dashboard: InvestorDashboardPageData;
    poolViews: InvestorPoolParticipationView[];
    actionableSettlements: CycleInvestorSettlement[];
  }> {
    const user = await requireAuth();
    const dashboard = await this.getDashboardPageData();

    const participations = dashboard.investment.participations;
    const fundIds = [...new Set(participations.map((pool) => pool.fundId))];

    const tradingFundIds = await investmentCycleService.listTradingCycleFundIds(fundIds);

    await cycleInvestorSettlementService.syncPendingSettlementsForEligiblePools(
      user.id,
      fundIds.filter((fundId) => !tradingFundIds.has(fundId)),
      tradingFundIds
    );

    const pendingSettlements =
      await cycleInvestorSettlementService.listPendingForInvestor(user.id);

    const allFundIds = [
      ...new Set([
        ...participations.map((pool) => pool.fundId),
        ...pendingSettlements.map((settlement) => settlement.fundId),
      ]),
    ];

    const fundingFundIds = await investmentCycleService.listFundingCycleFundIds(allFundIds);

    const settlementByFund = new Map<string, CycleInvestorSettlement>();
    for (const settlement of pendingSettlements) {
      if (!settlementByFund.has(settlement.fundId)) {
        settlementByFund.set(settlement.fundId, settlement);
      }
    }

    const participationByFund = new Map(
      participations.map((participation) => [participation.fundId, participation])
    );

    const admin = createAdminClient();
    const { data: tradingCycles } = await admin
      .from("investment_cycles")
      .select("id, fund_id")
      .in("fund_id", [...tradingFundIds])
      .in("status", ["trading", "distribution"]);

    const cycleIdByFund = new Map(
      ((tradingCycles ?? []) as Array<{ id: string; fund_id: string }>).map((row) => [
        row.fund_id,
        row.id,
      ])
    );

    const allocationByFund = new Map<string, number>();
    const cycleIds = [...cycleIdByFund.values()];
    if (cycleIds.length > 0) {
      const { data: allocationRows } = await admin
        .from("investment_allocations")
        .select("investment_cycle_id, amount, status")
        .eq("investor_id", user.id)
        .in("investment_cycle_id", cycleIds)
        .in("status", RAISED_CAPITAL_ALLOCATION_STATUSES);

      for (const row of (allocationRows ?? []) as Array<{
        investment_cycle_id: string;
        amount: number | string;
      }>) {
        const fundId = [...cycleIdByFund.entries()].find(
          ([, cycleId]) => cycleId === row.investment_cycle_id
        )?.[0];
        if (!fundId) continue;
        allocationByFund.set(
          fundId,
          (allocationByFund.get(fundId) ?? 0) + toNumber(row.amount)
        );
      }
    }

    const poolViews: InvestorPoolParticipationView[] = allFundIds
      .map((fundId) => {
        const participation = participationByFund.get(fundId);
        const pendingSettlement = settlementByFund.get(fundId) ?? null;
        const hasActiveTradingCycle = tradingFundIds.has(fundId);
        const hasActiveFundingCycle = fundingFundIds.has(fundId);

        if (!participation && !pendingSettlement) return null;

        const baseParticipation =
          participation ??
          ({
            fundId,
            poolName: pendingSettlement?.poolName ?? "Pool",
            amountInvested: 0,
            currentValue: pendingSettlement?.principalAmount ?? 0,
            poolProfit: pendingSettlement?.profitAmount ?? 0,
            projectedReturnPct: null,
            projectedRoiMultiplier: null,
            poolWinRate: 0,
            investmentStartDate: null,
            termEndDate: null,
            termEnded: false,
            poolDurationDays: null,
            payoutDurationLabel: "—",
          } satisfies WalletPoolParticipation);

        const displayCapitalInvested = resolveInvestorDisplayCapital({
          hasActiveTradingCycle,
          portfolioInvested: baseParticipation.amountInvested,
          pendingSettlement,
          cycleAllocationAmount: allocationByFund.get(fundId) ?? null,
        });

        return {
          ...baseParticipation,
          hasActiveTradingCycle,
          hasActiveFundingCycle,
          pendingSettlement,
          displayCapitalInvested,
          showPostCycleChoices: shouldShowPostCycleChoices({
            hasActiveTradingCycle,
            hasActiveFundingCycle,
            pendingSettlement,
            displayCapitalInvested,
            poolProfit: baseParticipation.poolProfit,
          }),
        };
      })
      .filter((view): view is InvestorPoolParticipationView => view != null)
      .sort((a, b) => {
        if (a.showPostCycleChoices !== b.showPostCycleChoices) {
          return a.showPostCycleChoices ? -1 : 1;
        }
        return b.amountInvested - a.amountInvested;
      });

    const actionableSettlements = pendingSettlements.filter(
      (settlement) => !tradingFundIds.has(settlement.fundId)
    );

    return { dashboard, poolViews, actionableSettlements };
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
export type { InvestorPoolParticipationView } from "@/domain/investment/investor-pool-participation";
