import { createAdminClient } from "@/lib/supabase/admin";
import {
  FEATURED_SECTION_KEYS,
  FEATURED_SECTION_LABELS,
  SECURITY_RISK_ORDER,
} from "@/constants/marketplace";
import { buildProtectionIndicators } from "@/lib/governance/protection-indicators";
import type {
  FeaturedMarketplaceSection,
  MarketplaceActivityItem,
  MarketplaceFilters,
  MarketplaceInvestorStats,
  MarketplaceJournalEntry,
  MarketplacePerformanceAnalytics,
  MarketplacePoolCard,
  MarketplacePoolDetail,
  PoolManagerPublicSummary,
} from "@/domain/marketplace/types";

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

type FundRow = Record<string, unknown>;

type ManagerRow = {
  id: string;
  slug: string | null;
  display_name: string;
  icon_url: string | null;
  profile_photo_url: string | null;
  cover_image_url: string | null;
  bio: string | null;
  country: string | null;
  markets: string[] | null;
  trading_style: string | null;
  trading_since: string | null;
  is_verified: boolean;
  ryvonx_rating: number | null;
  security_rating: number | null;
  aggressiveness_rating: number | null;
  win_rate_pct: number | null;
  avg_monthly_return_pct: number | null;
  max_drawdown_pct: number | null;
  approved_at: string | null;
  created_at: string;
};

function mapManagerSummary(row: ManagerRow | null): PoolManagerPublicSummary | null {
  if (!row) return null;
  const createdAt = new Date(row.created_at);
  const yearsOn =
    (Date.now() - createdAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    photoUrl: row.profile_photo_url ?? row.icon_url,
    coverUrl: row.cover_image_url,
    bio: row.bio,
    country: row.country,
    markets: row.markets ?? [],
    tradingStyle: row.trading_style,
    tradingSince: row.trading_since,
    isVerified: row.is_verified,
    ryvonxRating: row.ryvonx_rating != null ? toNumber(row.ryvonx_rating) : null,
    securityRating: row.security_rating != null ? toNumber(row.security_rating) : null,
    aggressivenessRating:
      row.aggressiveness_rating != null ? toNumber(row.aggressiveness_rating) : null,
    winRatePct: row.win_rate_pct != null ? toNumber(row.win_rate_pct) : null,
    avgMonthlyReturnPct:
      row.avg_monthly_return_pct != null ? toNumber(row.avg_monthly_return_pct) : null,
    maxDrawdownPct: row.max_drawdown_pct != null ? toNumber(row.max_drawdown_pct) : null,
    yearsOnRyvonX: Math.max(0, Math.round(yearsOn * 10) / 10),
    managerLevel: null,
    achievements: [],
  };
}

async function fetchManagersMap(
  db: ReturnType<typeof createAdminClient>,
  managerIds: string[]
): Promise<Map<string, ManagerRow>> {
  const map = new Map<string, ManagerRow>();
  if (managerIds.length === 0) return map;

  const { data } = await db.from("pool_managers").select("*").in("id", managerIds);
  for (const m of (data ?? []) as ManagerRow[]) {
    map.set(m.id, m);
  }
  return map;
}

async function fetchMonthlyRoiMap(
  db: ReturnType<typeof createAdminClient>,
  poolIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (poolIds.length === 0) return map;

  const { data } = await db.from("pool_stats").select("fund_id, monthly_roi").in("fund_id", poolIds);
  for (const row of (data ?? []) as Array<{ fund_id: string; monthly_roi: number }>) {
    map.set(row.fund_id, toNumber(row.monthly_roi));
  }
  return map;
}

function mapToCard(
  row: FundRow,
  manager: ManagerRow | null,
  monthlyRoi: number
): MarketplacePoolCard {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    tagline: (row.tagline as string | null) ?? null,
    logoUrl: (row.logo_url as string | null) ?? null,
    coverImageUrl: (row.cover_image_url as string | null) ?? null,
    cardBackgroundColor: (row.card_background_color as string | null) ?? null,
    categories: (row.categories as string[]) ?? [],
    marketsTraded: (row.markets_traded as string[]) ?? [],
    managerName:
      (row.pool_manager_name as string | null) ?? manager?.display_name ?? null,
    managerSlug: manager?.slug ?? null,
    managerVerified: manager?.is_verified ?? false,
    managerPhotoUrl: manager?.profile_photo_url ?? manager?.icon_url ?? null,
    assetsUnderManagement: toNumber(row.assets_under_management as number),
    activeInvestors: toNumber(row.active_investors as number),
    monthlyReturnPct: monthlyRoi || toNumber(row.current_roi as number) / 12,
    overallReturnPct: toNumber(row.current_roi as number),
    maxDrawdownPct: manager?.max_drawdown_pct != null ? toNumber(manager.max_drawdown_pct) : null,
    securityRating: (row.security_rating as string | null) ?? null,
    aggressivenessLevel: (row.aggressiveness_level as string | null) ?? null,
    poolHealth: (row.pool_health as string) ?? "healthy",
    capacityStatus: (row.capacity_status as string) ?? "open",
    minInvestment: toNumber(row.min_investment as number),
    ryvonxRating: row.ryvonx_rating != null ? toNumber(row.ryvonx_rating as number) : null,
    featured: Boolean(row.featured),
    listedAt: (row.listed_at as string | null) ?? null,
    tradingPair: (row.trading_pair as string) ?? "Multi-asset",
    tradingStyle: manager?.trading_style ?? null,
    protectionIndicators: buildProtectionIndicators({
      governance_verified: Boolean(row.governance_verified),
      governance_approved: Boolean(row.governance_approved),
      under_governance_review: Boolean(row.under_governance_review),
      on_probation: Boolean(row.on_probation),
      pool_health: (row.pool_health as string) ?? "healthy",
      governance_stage: (row.governance_stage as string) ?? "active",
      is_ryvonx_backed: Boolean(row.is_ryvonx_backed),
    }),
    onProbation: Boolean(row.on_probation),
    governanceVerified: Boolean(row.governance_verified),
    isRyvonxBacked: Boolean(row.is_ryvonx_backed),
    investorCapital: toNumber(row.investor_capital as number),
    ryvonxCapital: toNumber(row.ryvonx_capital as number),
    investorPct: (() => {
      const inv = toNumber(row.investor_capital as number);
      const rx = toNumber(row.ryvonx_capital as number);
      const t = inv + rx;
      return t > 0 ? Math.round((inv / t) * 1000) / 10 : 100;
    })(),
    ryvonxPct: (() => {
      const inv = toNumber(row.investor_capital as number);
      const rx = toNumber(row.ryvonx_capital as number);
      const t = inv + rx;
      return t > 0 ? Math.round((rx / t) * 1000) / 10 : 0;
    })(),
    growthRatePct: row.growth_rate_pct != null ? toNumber(row.growth_rate_pct as number) : null,
  };
}

function applyFilters(pools: MarketplacePoolCard[], filters: MarketplaceFilters): MarketplacePoolCard[] {
  let result = [...pools];
  const q = filters.search?.trim().toLowerCase();

  if (q) {
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.managerName?.toLowerCase().includes(q) ?? false) ||
        p.tagline?.toLowerCase().includes(q)
    );
  }

  if (filters.category) {
    result = result.filter((p) => p.categories.includes(filters.category!));
  }

  if (filters.manager) {
    const mq = filters.manager.toLowerCase();
    result = result.filter((p) => p.managerName?.toLowerCase().includes(mq));
  }

  if (filters.securityRating) {
    result = result.filter((p) => p.securityRating === filters.securityRating);
  }

  if (filters.aggressiveness) {
    result = result.filter((p) => p.aggressivenessLevel === filters.aggressiveness);
  }

  if (filters.minInvestmentMax != null) {
    result = result.filter((p) => p.minInvestment <= filters.minInvestmentMax!);
  }

  if (filters.minMonthlyReturn != null) {
    result = result.filter((p) => p.monthlyReturnPct >= filters.minMonthlyReturn!);
  }

  if (filters.minAum != null) {
    result = result.filter((p) => p.assetsUnderManagement >= filters.minAum!);
  }

  if (filters.minInvestors != null) {
    result = result.filter((p) => p.activeInvestors >= filters.minInvestors!);
  }

  if (filters.market) {
    result = result.filter(
      (p) =>
        p.marketsTraded.some((m) => m.toLowerCase() === filters.market!.toLowerCase()) ||
        p.tradingPair.toLowerCase().includes(filters.market!.toLowerCase())
    );
  }

  if (filters.poolHealth) {
    result = result.filter((p) => p.poolHealth === filters.poolHealth);
  }

  if (filters.capacityStatus) {
    result = result.filter((p) => p.capacityStatus === filters.capacityStatus);
  }

  return result;
}

function sortPools(pools: MarketplacePoolCard[], sort?: string): MarketplacePoolCard[] {
  const items = [...pools];
  switch (sort) {
    case "highest_return":
      return items.sort((a, b) => b.overallReturnPct - a.overallReturnPct);
    case "lowest_risk":
      return items.sort(
        (a, b) =>
          (SECURITY_RISK_ORDER[a.securityRating ?? "balanced"] ?? 2) -
          (SECURITY_RISK_ORDER[b.securityRating ?? "balanced"] ?? 2)
      );
    case "most_investors":
      return items.sort((a, b) => b.activeInvestors - a.activeInvestors);
    case "highest_aum":
      return items.sort((a, b) => b.assetsUnderManagement - a.assetsUnderManagement);
    case "newest":
      return items.sort(
        (a, b) =>
          new Date(b.listedAt ?? 0).getTime() - new Date(a.listedAt ?? 0).getTime()
      );
    case "trending":
      return items.sort(
        (a, b) =>
          b.activeInvestors * 0.6 +
          b.monthlyReturnPct * 0.4 -
          (a.activeInvestors * 0.6 + a.monthlyReturnPct * 0.4)
      );
    case "best_rated":
    default:
      return items.sort((a, b) => (b.ryvonxRating ?? 0) - (a.ryvonxRating ?? 0));
  }
}

export const marketplaceService = {
  async listListedPools(): Promise<FundRow[]> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("funds")
      .select("*")
      .eq("is_marketplace_listed", true)
      .in("lifecycle_status", ["live", "approved"])
      .eq("status", "active")
      .order("sort_order", { ascending: true })
      .order("admin_ranking", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as FundRow[];
  },

  async getMarketplacePools(filters: MarketplaceFilters = {}): Promise<MarketplacePoolCard[]> {
    const rows = await this.listListedPools();
    const db = createAdminClient();

    const managerIds = [
      ...new Set(rows.map((r) => r.pool_manager_id as string | null).filter(Boolean)),
    ] as string[];
    const poolIds = rows.map((r) => r.id as string);

    const [managersMap, monthlyMap] = await Promise.all([
      fetchManagersMap(db, managerIds),
      fetchMonthlyRoiMap(db, poolIds),
    ]);

    const cards = rows
      .filter((row) => !Boolean(row.hide_from_marketplace) && row.pool_health !== "suspended")
      .map((row) => {
      const managerId = row.pool_manager_id as string | null;
      const manager = managerId ? managersMap.get(managerId) ?? null : null;
      return mapToCard(row, manager, monthlyMap.get(row.id as string) ?? 0);
    });

    const filtered = applyFilters(cards, filters);
    return sortPools(filtered, filters.sort);
  },

  async getPoolBySlug(slug: string): Promise<MarketplacePoolDetail | null> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("funds")
      .select("*")
      .eq("slug", slug)
      .eq("is_marketplace_listed", true)
      .in("lifecycle_status", ["live", "approved"])
      .eq("status", "active")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    const row = data as FundRow;
    const managerId = row.pool_manager_id as string | null;
    let manager: ManagerRow | null = null;
    if (managerId) {
      const { data: m } = await db.from("pool_managers").select("*").eq("id", managerId).maybeSingle();
      manager = (m as ManagerRow | null) ?? null;
    }

    const monthlyMap = await fetchMonthlyRoiMap(db, [row.id as string]);
    const card = mapToCard(row, manager, monthlyMap.get(row.id as string) ?? 0);
    const faqRaw = row.pool_faq;
    const faq = Array.isArray(faqRaw)
      ? (faqRaw as Array<{ question: string; answer: string }>)
      : [];

    return {
      ...card,
      description: (row.description as string) ?? "",
      poolDescription: (row.pool_description as string) ?? (row.description as string) ?? "",
      poolDurationDays: row.pool_duration_days as number | null,
      suggestedInvestment: toNumber(
        (row.suggested_investment as number | null) ?? (row.min_investment as number)
      ),
      riskSummary: (row.risk_summary as string | null) ?? null,
      adminComments: (row.admin_comments as string | null) ?? null,
      targetCapital: toNumber(row.target_capital as number),
      currentCapital: toNumber(row.current_capital as number),
      maxAum: row.max_aum != null ? toNumber(row.max_aum as number) : null,
      maxInvestorsCap:
        row.max_investors_cap != null ? toNumber(row.max_investors_cap as number) : null,
      profitTargetPct: toNumber(row.profit_target_pct as number),
      isInviteOnly: Boolean(row.is_invite_only),
      suspensionReason: (row.suspension_reason as string | null) ?? null,
      suspendedAt: (row.suspended_at as string | null) ?? null,
      allocationStatus: (row.allocation_status as string) ?? "none",
      allocationReviewAt: (row.allocation_review_at as string | null) ?? null,
      manager: mapManagerSummary(manager),
      faq,
    };
  },

  async getFeaturedSections(): Promise<FeaturedMarketplaceSection[]> {
    const pools = await this.getMarketplacePools();
    if (pools.length === 0) return [];

    const sections: FeaturedMarketplaceSection[] = [];

    const pick = (sorted: MarketplacePoolCard[], limit = 6) => sorted.slice(0, limit);

    for (const key of FEATURED_SECTION_KEYS) {
      let sorted: MarketplacePoolCard[];
      switch (key) {
        case "most_popular":
          sorted = [...pools].sort((a, b) => b.activeInvestors - a.activeInvestors);
          break;
        case "highest_rated":
          sorted = [...pools].sort((a, b) => (b.ryvonxRating ?? 0) - (a.ryvonxRating ?? 0));
          break;
        case "fastest_growing":
          sorted = [...pools].sort((a, b) => b.monthlyReturnPct - a.monthlyReturnPct);
          break;
        case "most_consistent":
          sorted = [...pools].sort(
            (a, b) => (b.ryvonxRating ?? 0) - (a.ryvonxRating ?? 0)
          );
          break;
        case "lowest_drawdown":
          sorted = [...pools].sort(
            (a, b) => (a.maxDrawdownPct ?? 999) - (b.maxDrawdownPct ?? 999)
          );
          break;
        case "highest_aum":
          sorted = [...pools].sort((a, b) => b.assetsUnderManagement - a.assetsUnderManagement);
          break;
        case "newest_verified":
          sorted = [...pools].sort(
            (a, b) =>
              new Date(b.listedAt ?? 0).getTime() - new Date(a.listedAt ?? 0).getTime()
          );
          break;
        default:
          sorted = pools;
      }

      const sectionPools = pick(sorted);
      if (sectionPools.length > 0) {
        sections.push({
          key,
          title: FEATURED_SECTION_LABELS[key] ?? key,
          pools: sectionPools,
        });
      }
    }

    return sections;
  },

  async getManagerPools(managerSlug: string): Promise<MarketplacePoolCard[]> {
    const db = createAdminClient();
    const { data: manager } = await db
      .from("pool_managers")
      .select("id")
      .eq("slug", managerSlug)
      .eq("status", "approved")
      .maybeSingle();

    if (!manager) return [];
    const managerId = (manager as { id: string }).id;

    const { data } = await db
      .from("funds")
      .select("*")
      .eq("pool_manager_id", managerId)
      .eq("is_marketplace_listed", true)
      .in("lifecycle_status", ["live", "approved"])
      .eq("status", "active");

    const rows = (data ?? []) as FundRow[];
    const { data: fullManager } = await db.from("pool_managers").select("*").eq("id", managerId).single();
    const monthlyMap = await fetchMonthlyRoiMap(
      db,
      rows.map((r) => r.id as string)
    );

    return rows.map((row) =>
      mapToCard(row, fullManager as ManagerRow, monthlyMap.get(row.id as string) ?? 0)
    );
  },

  async getPerformanceAnalytics(poolId: string): Promise<MarketplacePerformanceAnalytics> {
    const db = createAdminClient();

    const [snapshotsResult, statsResult] = await Promise.all([
      db
        .from("performance_snapshots")
        .select("date, pool_value, cumulative_roi, daily_roi")
        .eq("fund_id", poolId)
        .order("date", { ascending: true })
        .limit(365),
      db.from("pool_stats").select("*").eq("fund_id", poolId).maybeSingle(),
    ]);

    const snapshots = (snapshotsResult.data ?? []) as Array<{
      date: string;
      pool_value: number;
      cumulative_roi: number;
      daily_roi: number;
    }>;

    const stats = statsResult.data as {
      weekly_roi?: number;
      monthly_roi?: number;
    } | null;

    const historicalGrowth = snapshots.map((s) => ({
      date: s.date,
      poolValue: toNumber(s.pool_value),
      cumulativeRoi: toNumber(s.cumulative_roi),
    }));

    const monthlyMap = new Map<string, number[]>();
    for (const s of snapshots) {
      const month = s.date.slice(0, 7);
      const arr = monthlyMap.get(month) ?? [];
      arr.push(toNumber(s.daily_roi));
      monthlyMap.set(month, arr);
    }

    const monthlyReturns = [...monthlyMap.entries()].map(([month, rois]) => ({
      month,
      roi: rois.reduce((a, b) => a + b, 0),
    }));

    const monthlyValues = monthlyReturns.map((m) => m.roi);
    const winningMonths = monthlyValues.filter((v) => v > 0).length;
    const losingMonths = monthlyValues.filter((v) => v < 0).length;

    const latestRoi = historicalGrowth[historicalGrowth.length - 1]?.cumulativeRoi ?? 0;

    return {
      historicalGrowth,
      monthlyReturns,
      weeklyReturnPct: toNumber(stats?.weekly_roi),
      monthlyReturnPct: toNumber(stats?.monthly_roi),
      averageReturnPct:
        monthlyValues.length > 0
          ? monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length
          : 0,
      bestMonthPct: monthlyValues.length ? Math.max(...monthlyValues) : null,
      worstMonthPct: monthlyValues.length ? Math.min(...monthlyValues) : null,
      maxDrawdownPct: null,
      avgDrawdownPct: null,
      winningMonths,
      losingMonths,
      totalRoiPct: latestRoi,
    };
  },

  async getPublicJournal(poolId: string, limit = 20): Promise<MarketplaceJournalEntry[]> {
    const db = createAdminClient();

    const { data: trades } = await db
      .from("trades")
      .select("id, symbol, direction, entry_price, exit_price, status, pnl_percentage, closed_at, notes")
      .eq("fund_id", poolId)
      .eq("status", "closed")
      .not("published_at", "is", null)
      .order("closed_at", { ascending: false })
      .limit(limit);

    return ((trades ?? []) as Array<Record<string, unknown>>).map((t) => ({
      id: t.id as string,
      asset: t.symbol as string,
      direction: t.direction as string,
      entryPrice: toNumber(t.entry_price as number),
      exitPrice: t.exit_price != null ? toNumber(t.exit_price as number) : null,
      status: t.status as string,
      roiPct: t.pnl_percentage != null ? toNumber(t.pnl_percentage as number) : null,
      date: (t.closed_at as string) ?? "",
      notes: (t.notes as string | null) ?? null,
    }));
  },

  async getInvestorStats(poolId: string): Promise<MarketplaceInvestorStats> {
    const db = createAdminClient();

    const { data: portfolios } = await db
      .from("investor_portfolios")
      .select("total_invested, current_value, investment_start_date")
      .eq("fund_id", poolId)
      .gt("total_invested", 0);

    const rows = (portfolios ?? []) as Array<{
      total_invested: number;
      current_value: number;
      investment_start_date: string | null;
    }>;

    const invested = rows.map((r) => toNumber(r.total_invested));
    const totalCapital = rows.reduce((s, r) => s + toNumber(r.current_value), 0);
    const avg =
      invested.length > 0 ? invested.reduce((a, b) => a + b, 0) / invested.length : 0;

    const monthStart = new Date();
    monthStart.setDate(1);

    const [depositsCount, withdrawalsCount] = await Promise.all([
      db
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("fund_id", poolId)
        .eq("type", "deposit")
        .eq("status", "approved")
        .gte("created_at", monthStart.toISOString()),
      db
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("fund_id", poolId)
        .eq("type", "withdrawal")
        .eq("status", "approved")
        .gte("created_at", monthStart.toISOString()),
    ]);

    return {
      currentInvestors: rows.length,
      totalCapital,
      averageInvestment: avg,
      largestInvestment: invested.length ? Math.max(...invested) : 0,
      averageHoldingDays: null,
      recentDepositCount: depositsCount.count ?? 0,
      recentWithdrawalCount: withdrawalsCount.count ?? 0,
    };
  },

  async getRecentActivity(poolId: string, limit = 10): Promise<MarketplaceActivityItem[]> {
    const db = createAdminClient();
    const { data } = await db
      .from("transactions")
      .select("id, type, amount, created_at")
      .eq("fund_id", poolId)
      .in("type", ["deposit", "withdrawal"])
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(limit);

    return ((data ?? []) as Array<Record<string, unknown>>).map((t) => ({
      id: t.id as string,
      type: t.type as "deposit" | "withdrawal",
      amount: toNumber(t.amount as number),
      createdAt: t.created_at as string,
    }));
  },
};
