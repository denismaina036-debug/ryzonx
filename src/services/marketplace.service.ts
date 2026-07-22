import { createAdminClient } from "@/lib/supabase/admin";
import {
  FEATURED_SECTION_KEYS,
  FEATURED_SECTION_LABELS,
  SECURITY_RISK_ORDER,
} from "@/constants/marketplace";
import { buildProtectionIndicators } from "@/lib/governance/protection-indicators";
import { resolvePoolManagerPublicLabel, resolvePublicManagerName, managerRowToIdentity } from "@/domain/pool-manager/public-profile";
import { parseCoverImagePosition } from "@/domain/pools/cover-image-position";
import {
  aggregatePoolsByManager,
  filterManagers,
  sortManagers,
} from "@/features/marketplace/utils/aggregate-managers";
import type {
  FeaturedMarketplaceSection,
  FeaturedManagerSection,
  MarketplaceActivityItem,
  MarketplaceFilters,
  MarketplaceInvestorStats,
  MarketplaceJournalEntry,
  MarketplaceManagerCard,
  MarketplacePerformanceAnalytics,
  MarketplacePoolCard,
  MarketplacePoolDetail,
  PoolManagerPublicSummary,
} from "@/domain/marketplace/types";
import type { ReturnTier } from "@/features/investor/types/account";
import { normalizeFixedReturnRows, type FixedReturnRow } from "@/domain/pools/fixed-return";
import { normalizeMarketCodes } from "@/domain/reference-data/utils";
import { tradeEntryService } from "@/services/trade-entry.service";
import { tradingSessionLabel } from "@/domain/pools/trading-session";
import { INVESTMENT_CYCLE_ALLOCATABLE_STATUSES } from "@/constants/investment-cycle";
import type { InvestmentCycleStatus } from "@/constants/investment-cycle";
import {
  formatExpectedDurationLabel,
  formatPoolLevelLabel,
  formatRiskLevelTag,
  resolveTradingAssetLabel,
  stripInstrumentFromPoolName,
  resolvePublicDisplayCount,
} from "@/features/marketplace/utils/marketplace-pool-card-presentation";
import {
  computeFundingProgressPct,
  computeRemainingCapital,
} from "@/domain/investment/cycle-metrics";
import { investmentCycleMetricsService } from "@/services/investment-cycle-metrics.service";

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function readManagedPoolConfig(poolFaq: unknown) {
  if (!poolFaq || typeof poolFaq !== "object" || Array.isArray(poolFaq)) return {};
  return ((poolFaq as { managedPool?: Record<string, unknown> }).managedPool ?? {}) as {
    returnModel?: string;
    fixedReturnRows?: FixedReturnRow[];
    tradingSessionKey?: string;
    tradingSessionCustom?: string;
    tradingTimeNy?: string;
    marketTypeCode?: string;
    tradingInstrumentCode?: string;
    marketsTradedCodes?: string[];
    tradingInstrumentCodes?: string[];
    fundingPeriodDays?: number;
    strategyName?: string;
    durationUnit?: string;
    tradingStyle?: string;
  };
}

type CycleRow = {
  id: string;
  fund_id: string | null;
  status: InvestmentCycleStatus;
  cycle_number: number;
  name: string;
  opening_date: string | null;
  closing_date: string | null;
  funding_deadline: string | null;
  funding_started_at: string | null;
  raised_capital: number | string | null;
  target_capital: number | string | null;
  investor_count: number | null;
  max_capacity: number | string | null;
};

const ACTIVE_CYCLE_PRIORITY: InvestmentCycleStatus[] = [
  "funding",
  "trading",
  "distribution",
  "approved",
];

function pickActiveCycleForFund(
  cycles: CycleRow[],
  fundId: string
): CycleRow | null {
  const fundCycles = cycles.filter((c) => c.fund_id === fundId);
  for (const status of ACTIVE_CYCLE_PRIORITY) {
    const match = fundCycles.find((c) => c.status === status);
    if (match) return match;
  }
  return null;
}

async function enrichPoolCards(
  db: ReturnType<typeof createAdminClient>,
  rows: FundRow[],
  cards: MarketplacePoolCard[],
  managersMap: Map<string, ManagerRow>
): Promise<MarketplacePoolCard[]> {
  if (rows.length === 0) return cards;

  const poolIds = rows.map((r) => r.id as string);
  const { data: cycleRows } = await db
    .from("investment_cycles")
    .select(
      "id, fund_id, status, cycle_number, name, opening_date, closing_date, funding_deadline, funding_started_at, raised_capital, target_capital, investor_count, max_capacity"
    )
    .in("fund_id", poolIds)
    .in("status", ["funding", "trading", "distribution", "approved"]);

  const cycles = (cycleRows ?? []) as CycleRow[];
  const activeCycleIds = [
    ...new Set(
      rows
        .map((row) => pickActiveCycleForFund(cycles, row.id as string))
        .filter((cycle): cycle is CycleRow => cycle != null)
        .map((cycle) => cycle.id)
    ),
  ];
  const raisedByCycle = await investmentCycleMetricsService.sumRaisedCapitalForCycles(activeCycleIds);

  // Repair historical joins that updated fund capital but never created cycle allocations.
  const repairTargets = rows
    .map((row) => {
      const cycle = pickActiveCycleForFund(cycles, row.id as string);
      if (!cycle) return null;
      const live = raisedByCycle.get(cycle.id) ?? 0;
      const fundCapital = toNumber(row.current_capital as number | null);
      if (live <= 0 && fundCapital > 0) {
        return { fundId: row.id as string, cycleId: cycle.id };
      }
      return null;
    })
    .filter((v): v is { fundId: string; cycleId: string } => v != null);

  const repairedInvestorCounts = new Map<string, number>();
  if (repairTargets.length > 0) {
    const { investmentAllocationService } = await import(
      "@/services/investment-allocation.service"
    );
    await Promise.all(
      repairTargets.map(({ fundId, cycleId }) =>
        investmentAllocationService.syncPortfolioInvestmentsToCycle(fundId, cycleId)
      )
    );
    const repaired = await investmentCycleMetricsService.sumRaisedCapitalForCycles(activeCycleIds);
    for (const [cycleId, amount] of repaired) {
      raisedByCycle.set(cycleId, amount);
    }
    const { data: repairedCycles } = await db
      .from("investment_cycles")
      .select("id, investor_count")
      .in(
        "id",
        repairTargets.map((t) => t.cycleId)
      );
    for (const row of (repairedCycles ?? []) as Array<{ id: string; investor_count: number }>) {
      repairedInvestorCounts.set(row.id, toNumber(row.investor_count));
    }
  }

  const managerIdsForReviews = [
    ...new Set(cards.map((c) => c.managerId).filter(Boolean)),
  ] as string[];
  const liveReviewCounts = new Map<string, number>();
  if (managerIdsForReviews.length > 0) {
    const { data: reviewRows } = await db
      .from("pool_manager_reviews")
      .select("pool_manager_id")
      .in("pool_manager_id", managerIdsForReviews);
    for (const review of (reviewRows ?? []) as Array<{ pool_manager_id: string }>) {
      liveReviewCounts.set(
        review.pool_manager_id,
        (liveReviewCounts.get(review.pool_manager_id) ?? 0) + 1
      );
    }
  }

  return cards.map((card) => {
    const row = rows.find((r) => (r.id as string) === card.id);
    if (!row) return card;

    const managed = readManagedPoolConfig(row.pool_faq);
    const cycle = pickActiveCycleForFund(cycles, card.id);
    const manager = card.managerId ? managersMap.get(card.managerId) ?? null : null;
    const targetCapital = cycle?.target_capital != null
      ? toNumber(cycle.target_capital)
      : toNumber(row.target_capital as number | null);
    const liveInvestors = toNumber(row.active_investors as number);
    const seedInvestors = toNumber(row.display_active_investors as number);
    const managerSeedInvestors = manager?.display_investor_count ?? 0;
    const liveRaisedCapital = cycle
      ? raisedByCycle.get(cycle.id) ?? 0
      : toNumber(row.current_capital as number | null);
    const seedRaisedCapital = toNumber(row.display_raised_capital as number);
    const raisedCapital = resolvePublicDisplayCount(seedRaisedCapital, liveRaisedCapital);
    const remainingCapital = computeRemainingCapital(targetCapital, raisedCapital);
    const fundingProgressPct = computeFundingProgressPct(targetCapital, raisedCapital);
    // Participant max is target investors — never cycle.max_capacity (that stores capital).
    const maxParticipants =
      row.target_investors != null
        ? toNumber(row.target_investors as number)
        : row.max_investors_cap != null
          ? toNumber(row.max_investors_cap as number)
          : null;
    const liveParticipantCount =
      cycle != null && repairedInvestorCounts.has(cycle.id)
        ? (repairedInvestorCounts.get(cycle.id) ?? 0)
        : cycle?.investor_count != null
          ? toNumber(cycle.investor_count)
          : liveInvestors;
    const cycleParticipantCount = resolvePublicDisplayCount(seedInvestors, liveParticipantCount);
    const fundingPeriodEndsAt =
      cycle?.funding_deadline ?? cycle?.closing_date ?? null;
    const tradingAssetTag = resolveTradingAssetLabel({
      tradingInstrumentCode:
        managed.tradingInstrumentCodes?.[0] ?? managed.tradingInstrumentCode ?? null,
      tradingPair: card.tradingPair,
      marketsTraded: card.marketsTraded,
    });
    const returnModel = managed.returnModel === "fixed" ? "fixed" : "variable";
    const liveReviewCount = card.managerId
      ? liveReviewCounts.get(card.managerId) ?? 0
      : 0;
    const seedReviewCount = manager?.display_review_count ?? 0;
    // Star rating = admin Overall Rating. Never use aggressiveness (often 2.5 Balanced).
    const managerOverallRating =
      manager?.ryvonx_rating != null
        ? toNumber(manager.ryvonx_rating)
        : card.ryvonxRating;
    const aggressiveness =
      manager?.aggressiveness_rating != null
        ? toNumber(manager.aggressiveness_rating)
        : null;
    const looksLikeAggressivenessBleed =
      managerOverallRating != null &&
      aggressiveness != null &&
      managerOverallRating === aggressiveness &&
      card.ryvonxRating != null &&
      card.ryvonxRating !== managerOverallRating;
    const resolvedManagerRating = looksLikeAggressivenessBleed
      ? card.ryvonxRating
      : managerOverallRating;

    return {
      ...card,
      name: card.name,
      displayPoolName: stripInstrumentFromPoolName(card.name, tradingAssetTag),
      activeInvestors: resolvePublicDisplayCount(
        Math.max(seedInvestors, managerSeedInvestors),
        liveInvestors
      ),
      activeCycle: cycle
        ? {
            id: cycle.id,
            cycleNumber: cycle.cycle_number,
            name: cycle.name,
            status: cycle.status,
            openingDate: cycle.opening_date,
            closingDate: cycle.closing_date,
            fundingDeadline: cycle.funding_deadline,
            fundingStartedAt: cycle.funding_started_at ?? cycle.opening_date,
            poolVersion: 1,
          }
        : null,
      canParticipate: cycle
        ? INVESTMENT_CYCLE_ALLOCATABLE_STATUSES.includes(cycle.status)
        : false,
      fundingPeriodEndsAt,
      raisedCapital,
      targetCapital,
      remainingCapital,
      fundingProgressPct,
      cycleParticipantCount,
      maxParticipants,
      investorSharePct: toNumber(row.investor_share_pct as number | null) || 80,
      poolManagerSharePct: toNumber(row.pool_manager_share_pct as number | null) || 20,
      returnModel,
      coverSubtitle:
        managed.strategyName?.trim() ||
        card.tagline?.trim() ||
        managed.tradingStyle?.trim() ||
        null,
      tradingAssetTag,
      strategyTag: managed.strategyName?.trim() || null,
      tradingStyleTag:
        managed.tradingStyle?.trim() || card.tradingStyle?.trim() || null,
      riskLevelTag: formatRiskLevelTag(card.aggressivenessLevel),
      expectedDurationLabel: formatExpectedDurationLabel(
        row.pool_duration_days as number | null,
        managed.durationUnit as string | undefined
      ),
      poolLevelLabel: formatPoolLevelLabel(card.capacityStatus),
      poolVerified: card.governanceVerified,
      managerRating: resolvedManagerRating,
      managerReviewCount: resolvePublicDisplayCount(seedReviewCount, liveReviewCount),
      poolDurationDays: row.pool_duration_days as number | null,
    };
  });
}

type FundRow = Record<string, unknown>;

type ManagerRow = {
  id: string;
  slug: string | null;
  username?: string | null;
  display_name: string;
  show_full_name?: boolean | null;
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
  display_review_count?: number;
  display_trade_count?: number;
  display_investor_count?: number;
};

function managerPublicLabel(row: ManagerRow | null): string | null {
  if (!row) return null;
  return resolvePoolManagerPublicLabel(managerRowToIdentity(row));
}

function mapManagerSummary(row: ManagerRow | null): PoolManagerPublicSummary | null {
  if (!row) return null;
  const createdAt = new Date(row.created_at);
  const yearsOn =
    (Date.now() - createdAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return {
    id: row.id,
    slug: row.slug,
    displayName: managerPublicLabel(row) ?? resolvePublicManagerName(managerRowToIdentity(row)) ?? "@manager",
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
  for (const m of (data ?? []) as unknown as ManagerRow[]) {
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
    coverImagePosition: parseCoverImagePosition(row.cover_image_position),
    cardBackgroundColor: (row.card_background_color as string | null) ?? null,
    categories: (row.categories as string[]) ?? [],
    marketsTraded: (row.markets_traded as string[]) ?? [],
    managerName: resolvePublicManagerName(
      manager ? managerRowToIdentity(manager) : null,
      row.pool_manager_name as string | null
    ),
    managerSlug: manager?.slug ?? null,
    managerId: manager?.id ?? null,
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
    activeCycle: null,
    canParticipate: false,
    fundingPeriodEndsAt: null,
    raisedCapital: 0,
    targetCapital: 0,
    cycleParticipantCount: 0,
    maxParticipants: null,
    investorSharePct: toNumber(row.investor_share_pct as number | null) || 80,
    poolManagerSharePct: toNumber(row.pool_manager_share_pct as number | null) || 20,
    returnModel: "variable",
    coverSubtitle: null,
    tradingAssetTag: null,
    strategyTag: null,
    tradingStyleTag: null,
    riskLevelTag: null,
    expectedDurationLabel: "—",
    poolLevelLabel: formatPoolLevelLabel((row.capacity_status as string) ?? "open"),
    poolVerified: Boolean(row.governance_verified),
    managerRating: null,
    managerReviewCount: 0,
    displayPoolName: row.name as string,
    poolDurationDays: row.pool_duration_days as number | null,
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

function enrichManagerCards(
  cards: MarketplaceManagerCard[],
  managersMap: Map<string, ManagerRow>
): MarketplaceManagerCard[] {
  return cards.map((card) => {
    const managerId = card.activeOpportunities[0]?.managerId;
    const row = managerId ? managersMap.get(managerId) : null;
    if (!row) return card;

    const createdAt = new Date(row.created_at);
    const yearsOn =
      (Date.now() - createdAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

    return {
      ...card,
      id: row.id,
      slug: row.slug,
      displayName: managerPublicLabel(row) ?? "@manager",
      photoUrl: row.profile_photo_url ?? row.icon_url,
      country: row.country,
      bio: row.bio ?? card.bio,
      tradingStyle: row.trading_style ?? card.tradingStyle,
      isVerified: row.is_verified,
      ryvonxRating:
        row.ryvonx_rating != null ? toNumber(row.ryvonx_rating) : card.ryvonxRating,
      securityRating:
        row.security_rating != null
          ? String(row.security_rating)
          : card.securityRating,
      winRatePct: row.win_rate_pct != null ? toNumber(row.win_rate_pct) : null,
      avgMonthlyReturnPct:
        row.avg_monthly_return_pct != null
          ? toNumber(row.avg_monthly_return_pct)
          : card.avgMonthlyReturnPct,
      maxDrawdownPct:
        row.max_drawdown_pct != null ? toNumber(row.max_drawdown_pct) : card.maxDrawdownPct,
      yearsOnRyvonX: Math.max(0, Math.round(yearsOn * 10) / 10),
    };
  });
}

export const marketplaceService = {
  async listListedPools(): Promise<FundRow[]> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("funds")
      .select("*")
      .eq("is_marketplace_listed", true)
      .eq("lifecycle_status", "live")
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

    const enriched = await enrichPoolCards(db, rows, cards, managersMap);
    const filtered = applyFilters(enriched, filters);
    return sortPools(filtered, filters.sort);
  },

  async getMarketplaceManagers(filters: MarketplaceFilters = {}): Promise<MarketplaceManagerCard[]> {
    const pools = await this.getMarketplacePools(filters);
    const aggregated = aggregatePoolsByManager(pools);

    const db = createAdminClient();
    const managerIds = [
      ...new Set(
        aggregated
          .flatMap((m) => m.activeOpportunities.map((p) => p.managerId))
          .filter(Boolean)
      ),
    ] as string[];
    const managersMap = await fetchManagersMap(db, managerIds);

    const enriched = enrichManagerCards(aggregated, managersMap);
    const searched = filterManagers(enriched, filters.search ?? "");
    return sortManagers(searched, filters.sort);
  },

  async getFeaturedManagerSections(): Promise<FeaturedManagerSection[]> {
    const managers = await this.getMarketplaceManagers();
    if (managers.length === 0) return [];

    const sections: FeaturedManagerSection[] = [];
    const pick = (sorted: MarketplaceManagerCard[], limit = 6) => sorted.slice(0, limit);

    const sectionDefs: Array<{ key: string; title: string; sort: (a: MarketplaceManagerCard, b: MarketplaceManagerCard) => number }> = [
      { key: "highest_rated", title: "Highest Rated Managers", sort: (a, b) => (b.ryvonxRating ?? 0) - (a.ryvonxRating ?? 0) },
      { key: "most_popular", title: "Most Popular Managers", sort: (a, b) => b.activeInvestors - a.activeInvestors },
      { key: "highest_aum", title: "Highest AUM", sort: (a, b) => b.assetsUnderManagement - a.assetsUnderManagement },
      { key: "most_consistent", title: "Most Consistent", sort: (a, b) => (b.winRatePct ?? 0) - (a.winRatePct ?? 0) },
      { key: "newest_verified", title: "Newest Verified", sort: (a, b) => (b.yearsOnRyvonX ?? 0) - (a.yearsOnRyvonX ?? 0) },
    ];

    for (const def of sectionDefs) {
      const sorted = [...managers].sort(def.sort);
      const items = pick(sorted);
      if (items.length > 0) {
        sections.push({ key: def.key, title: def.title, managers: items });
      }
    }

    return sections;
  },

  async getPoolBySlug(slug: string): Promise<MarketplacePoolDetail | null> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("funds")
      .select("*")
      .eq("slug", slug)
      .eq("is_marketplace_listed", true)
      .eq("lifecycle_status", "live")
      .eq("status", "active")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    const row = data as FundRow;
    const managerId = row.pool_manager_id as string | null;
    let manager: ManagerRow | null = null;
    if (managerId) {
      const { data: m } = await db.from("pool_managers").select("*").eq("id", managerId).maybeSingle();
      manager = (m as unknown as ManagerRow | null) ?? null;
    }

    const monthlyMap = await fetchMonthlyRoiMap(db, [row.id as string]);
    const card = mapToCard(row, manager, monthlyMap.get(row.id as string) ?? 0);
    const managersMap = new Map<string, ManagerRow>();
    if (manager) managersMap.set(manager.id, manager);
    const [enriched] = await enrichPoolCards(db, [row], [card], managersMap);
    const enrichedCard: MarketplacePoolCard = enriched ?? card;
    const faqRaw = row.pool_faq;
    const faq = Array.isArray(faqRaw)
      ? (faqRaw as Array<{ question: string; answer: string }>)
      : [];
    const returnTiers = Array.isArray(row.return_tiers)
      ? (row.return_tiers as ReturnTier[])
      : [];
    const managedConfig = readManagedPoolConfig(row.pool_faq);
    const returnModel = managedConfig.returnModel === "fixed" ? "fixed" : "variable";
    const fixedReturnRows =
      returnModel === "fixed"
        ? managedConfig.fixedReturnRows?.length
          ? normalizeFixedReturnRows(managedConfig.fixedReturnRows)
          : normalizeFixedReturnRows(
              returnTiers.map((tier) => ({
                investmentAmount: tier.minAmount,
                fixedReturnAmount: tier.minAmount * (1 + tier.returnPct / 100),
              }))
            )
        : [];
    const activeOpenTrades =
      enrichedCard.activeCycle?.status === "trading" && enrichedCard.activeCycle.id
        ? await tradeEntryService.listOpenTradesPublic(enrichedCard.activeCycle.id)
        : [];

    const detail: MarketplacePoolDetail = {
      ...enrichedCard,
      description: (row.description as string) ?? "",
      poolDescription: (row.pool_description as string) ?? (row.description as string) ?? "",
      poolDurationDays: row.pool_duration_days as number | null,
      suggestedInvestment: toNumber(
        (row.suggested_investment as number | null) ?? (row.min_investment as number)
      ),
      riskSummary: (row.risk_summary as string | null) ?? null,
      adminComments: (row.admin_comments as string | null) ?? null,
      targetCapital:
        enrichedCard.targetCapital > 0
          ? enrichedCard.targetCapital
          : toNumber(row.target_capital as number),
      currentCapital: toNumber(row.current_capital as number),
      maxAum: row.max_aum != null ? toNumber(row.max_aum as number) : null,
      maxInvestorsCap:
        row.target_investors != null
          ? toNumber(row.target_investors as number)
          : row.max_investors_cap != null
            ? toNumber(row.max_investors_cap as number)
            : null,
      profitTargetPct: toNumber(row.profit_target_pct as number),
      maxInvestment: row.max_investment != null ? toNumber(row.max_investment as number) : null,
      returnTiers: returnModel === "variable" ? returnTiers : [],
      fixedReturnRows,
      isInviteOnly: Boolean(row.is_invite_only),
      suspensionReason: (row.suspension_reason as string | null) ?? null,
      suspendedAt: (row.suspended_at as string | null) ?? null,
      allocationStatus: (row.allocation_status as string) ?? "none",
      allocationReviewAt: (row.allocation_review_at as string | null) ?? null,
      tradingStartsAt: enrichedCard.fundingPeriodEndsAt,
      tradingSessionLabel: tradingSessionLabel(
        managedConfig.tradingSessionKey,
        managedConfig.tradingSessionCustom
      ),
      tradingTimeNy: managedConfig.tradingTimeNy ?? null,
      marketTypeCode: managedConfig.marketTypeCode ?? null,
      tradingInstrumentCode: managedConfig.tradingInstrumentCode ?? null,
      marketsTradedCodes: managedConfig.marketsTradedCodes?.length
        ? normalizeMarketCodes(managedConfig.marketsTradedCodes)
        : managedConfig.marketTypeCode
          ? normalizeMarketCodes([managedConfig.marketTypeCode])
          : [],
      tradingInstrumentCodes: managedConfig.tradingInstrumentCodes?.length
        ? managedConfig.tradingInstrumentCodes
        : managedConfig.tradingInstrumentCode
          ? [managedConfig.tradingInstrumentCode]
          : [],
      activeOpenTrades,
      manager: mapManagerSummary(manager),
      faq,
    };

    return detail;
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
      .eq("lifecycle_status", "live")
      .eq("status", "active");

    const rows = (data ?? []) as FundRow[];
    const managersMap = await fetchManagersMap(db, [managerId]);
    const monthlyMap = await fetchMonthlyRoiMap(
      db,
      rows.map((r) => r.id as string)
    );
    const cards = rows.map((row) => {
      const mgr = managersMap.get(managerId) ?? null;
      return mapToCard(row, mgr, monthlyMap.get(row.id as string) ?? 0);
    });
    return enrichPoolCards(db, rows, cards, managersMap);
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

  async getManagerJournalEntries(
    poolIds: string[],
    limitPerPool = 10
  ): Promise<MarketplaceJournalEntry[]> {
    if (poolIds.length === 0) return [];

    const batches = await Promise.all(
      poolIds.map((id) => this.getPublicJournal(id, limitPerPool))
    );

    return batches
      .flat()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 50);
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
