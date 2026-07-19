import type {
  FeaturedManagerSection,
  MarketplaceJournalEntry,
  MarketplaceManagerCard,
  MarketplacePoolCard,
  MarketplacePoolDetail,
} from "@/domain/marketplace/types";
import type { InvestorCycleCard, InvestorStrategyCard } from "@/domain/investment/investor-presentation";
import type { InvestmentCycle, Strategy } from "@/domain/investment/types";
import type { PoolManagerPublicProfile } from "@/domain/pool-manager/types";
import { poolManagerDashboardService } from "@/services/pool-manager-dashboard.service";
import { marketplaceService } from "@/services/marketplace.service";
import { strategyService } from "@/services/strategy.service";
import { investmentCycleService } from "@/services/investment-cycle.service";
import { investorInvestmentService } from "@/services/investor-investment.service";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Orchestrates marketplace pages — presentation and navigation data only.
 * Raw pool/investment queries remain in marketplaceService.
 */
export const marketplacePresentationService = {
  async getLandingPageData(): Promise<{
    pools: MarketplacePoolCard[];
    managers: MarketplaceManagerCard[];
    featuredManagerSections: FeaturedManagerSection[];
    strategies: InvestorStrategyCard[];
    cycles: InvestorCycleCard[];
  }> {
    const [pools, managers, featuredManagerSections, rawStrategies, rawCycles] =
      await Promise.all([
        marketplaceService.getMarketplacePools(),
        marketplaceService.getMarketplaceManagers(),
        marketplaceService.getFeaturedManagerSections(),
        strategyService.listPublic(),
        investmentCycleService.listPublic(),
      ]);

    const [strategies, cycles] = await Promise.all([
      investorInvestmentService.buildStrategyCardsFromList(rawStrategies),
      investorInvestmentService.buildCycleCardsFromList(rawCycles),
    ]);

    return { pools, managers, featuredManagerSections, strategies, cycles };
  },

  async getManagerProfilePageData(slug: string): Promise<{
    profile: PoolManagerPublicProfile;
    managedPools: MarketplacePoolCard[];
    journalEntries: MarketplaceJournalEntry[];
    strategies: InvestorStrategyCard[];
    cycles: InvestorCycleCard[];
  } | null> {
    const profile = await poolManagerDashboardService.getPublicProfile(slug);
    if (!profile) return null;

    const managedPools = await marketplaceService.getManagerPools(slug);
    const journalEntries = await marketplaceService.getManagerJournalEntries(
      managedPools.map((p) => p.id)
    );
    const rawStrategies = (await strategyService.listPublic()).filter(
      (s) => s.poolManagerId === profile.id
    );
    const rawCycles = (await investmentCycleService.listPublic()).filter(
      (c) => c.poolManagerId === profile.id
    );

    const [strategies, cycles] = await Promise.all([
      investorInvestmentService.buildStrategyCardsFromList(rawStrategies),
      investorInvestmentService.buildCycleCardsFromList(rawCycles),
    ]);

    return { profile, managedPools, journalEntries, strategies, cycles };
  },

  async getStrategyPageData(slug: string): Promise<{
    strategy: Strategy;
    cycles: InvestorCycleCard[];
    manager: { id: string; name: string; slug: string | null; rating: number | null };
    relatedStrategies: InvestorStrategyCard[];
  } | null> {
    const strategy = await strategyService.getPublicBySlug(slug);
    if (!strategy) return null;

    const db = createAdminClient();
    const { data: manager } = await db
      .from("pool_managers")
      .select("id, display_name, slug, ryvonx_rating")
      .eq("id", strategy.poolManagerId)
      .maybeSingle();

    const allCycles = await investmentCycleService.listPublic();
    const strategyCycles = allCycles.filter((c) => c.strategyId === strategy.id);
    const cycles = await investorInvestmentService.buildCycleCardsFromList(strategyCycles);

    const related = await strategyService.listPublic();
    const relatedStrategies = await investorInvestmentService.buildStrategyCardsFromList(
      related.filter((s) => s.id !== strategy.id && s.poolManagerId === strategy.poolManagerId).slice(0, 3)
    );

    const mgr = manager as { id: string; display_name: string; slug: string | null; ryvonx_rating: number | null } | null;

    return {
      strategy,
      cycles,
      manager: {
        id: mgr?.id ?? strategy.poolManagerId,
        name: mgr?.display_name ?? "Pool Manager",
        slug: mgr?.slug ?? null,
        rating: mgr?.ryvonx_rating ?? null,
      },
      relatedStrategies,
    };
  },

  async getCycleOpportunityPageData(slug: string): Promise<{
    cycle: InvestmentCycle;
    strategy: Strategy;
    manager: { id: string; name: string; slug: string | null; rating: number | null };
    relatedCycles: InvestorCycleCard[];
  } | null> {
    const cycle = await investmentCycleService.getPublicBySlug(slug);
    if (!cycle) return null;

    const strategy = await strategyService.getById(cycle.strategyId);
    if (!strategy) return null;

    const db = createAdminClient();
    const { data: manager } = await db
      .from("pool_managers")
      .select("id, display_name, slug, ryvonx_rating")
      .eq("id", cycle.poolManagerId)
      .maybeSingle();

    const allCycles = await investmentCycleService.listPublic();
    const relatedCycles = await investorInvestmentService.buildCycleCardsFromList(
      allCycles.filter((c) => c.id !== cycle.id && c.strategyId === strategy.id).slice(0, 3)
    );

    const mgr = manager as { id: string; display_name: string; slug: string | null; ryvonx_rating: number | null } | null;

    return {
      cycle,
      strategy,
      manager: {
        id: mgr?.id ?? cycle.poolManagerId,
        name: mgr?.display_name ?? "Pool Manager",
        slug: mgr?.slug ?? null,
        rating: mgr?.ryvonx_rating ?? null,
      },
      relatedCycles,
    };
  },

  async getOpportunityPageData(slug: string): Promise<{
    pool: MarketplacePoolDetail;
    performance: Awaited<ReturnType<typeof marketplaceService.getPerformanceAnalytics>>;
    journal: MarketplaceJournalEntry[];
    investorStats: Awaited<ReturnType<typeof marketplaceService.getInvestorStats>>;
    activity: Awaited<ReturnType<typeof marketplaceService.getRecentActivity>>;
    relatedPools: MarketplacePoolCard[];
  } | null> {
    const pool = await marketplaceService.getPoolBySlug(slug);
    if (!pool) return null;

    const [performance, journal, investorStats, activity, allPools] = await Promise.all([
      marketplaceService.getPerformanceAnalytics(pool.id),
      marketplaceService.getPublicJournal(pool.id),
      marketplaceService.getInvestorStats(pool.id),
      marketplaceService.getRecentActivity(pool.id),
      marketplaceService.getMarketplacePools(),
    ]);

    const sameManager = allPools.filter(
      (p) => p.id !== pool.id && p.managerSlug && p.managerSlug === pool.managerSlug
    );
    const relatedPools =
      sameManager.length > 0
        ? sameManager.slice(0, 2)
        : allPools.filter((p) => p.id !== pool.id).slice(0, 2);

    return { pool, performance, journal, investorStats, activity, relatedPools };
  },
};
