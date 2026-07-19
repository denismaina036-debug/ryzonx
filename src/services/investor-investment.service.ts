import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/session";
import { strategyService } from "@/services/strategy.service";
import { investmentCycleService } from "@/services/investment-cycle.service";
import { investmentAllocationService } from "@/services/investment-allocation.service";
import { marketplaceService } from "@/services/marketplace.service";
import { walletService } from "@/services/wallet.service";
import type { InvestmentAllocation, InvestmentCycle, Strategy } from "@/domain/investment/types";
import type {
  InvestorAllocationView,
  InvestorCycleCard,
  InvestorHomeData,
  InvestorPortfolioData,
  InvestorStrategyCard,
} from "@/domain/investment/investor-presentation";
import { INVESTMENT_ALLOCATION_STATUS_LABELS } from "@/constants/investment-allocation";

type ManagerRow = {
  id: string;
  display_name: string;
  slug: string | null;
  ryvonx_rating: number | null;
};

async function loadManagers(ids: string[]): Promise<Map<string, ManagerRow>> {
  if (ids.length === 0) return new Map();
  const db = createAdminClient();
  const { data } = await db
    .from("pool_managers")
    .select("id, display_name, slug, ryvonx_rating")
    .in("id", ids);

  const map = new Map<string, ManagerRow>();
  for (const row of (data ?? []) as ManagerRow[]) {
    map.set(row.id, row);
  }
  return map;
}

function fundingPct(cycle: InvestmentCycle): number | null {
  if (cycle.targetCapital == null || cycle.targetCapital <= 0) return null;
  return Math.min(100, Math.round((cycle.raisedCapital / cycle.targetCapital) * 1000) / 10);
}

function remainingCapacity(cycle: InvestmentCycle): number | null {
  if (cycle.maxCapacity == null) return null;
  return Math.max(0, cycle.maxCapacity - cycle.raisedCapital);
}

function toCycleCard(
  cycle: InvestmentCycle,
  strategy: Strategy,
  manager: ManagerRow | undefined
): InvestorCycleCard {
  return {
    id: cycle.id,
    slug: cycle.slug,
    name: cycle.name,
    description: cycle.description,
    status: cycle.status,
    strategyId: strategy.id,
    strategyName: strategy.name,
    strategySlug: strategy.slug,
    riskProfile: strategy.riskProfile,
    managerId: cycle.poolManagerId,
    managerName: manager?.display_name ?? "Pool Manager",
    managerSlug: manager?.slug ?? null,
    managerRating: manager?.ryvonx_rating ?? null,
    targetCapital: cycle.targetCapital,
    raisedCapital: cycle.raisedCapital,
    minInvestment: cycle.minInvestment,
    maxCapacity: cycle.maxCapacity,
    remainingCapacity: remainingCapacity(cycle),
    fundingPct: fundingPct(cycle),
    fundingDeadline: cycle.fundingDeadline,
    durationDays: cycle.durationDays,
    investorCount: cycle.investorCount,
    isAllocatable: investmentCycleService.isAllocatable(cycle.status),
  };
}

function toStrategyCard(
  strategy: Strategy,
  manager: ManagerRow | undefined,
  activeCyclesCount: number
): InvestorStrategyCard {
  return {
    id: strategy.id,
    slug: strategy.slug,
    name: strategy.name,
    description: strategy.description,
    riskProfile: strategy.riskProfile,
    investmentStyle: strategy.investmentStyle,
    supportedAssets: strategy.supportedAssets,
    managerId: strategy.poolManagerId,
    managerName: manager?.display_name ?? "Pool Manager",
    managerSlug: manager?.slug ?? null,
    managerRating: manager?.ryvonx_rating ?? null,
    activeCyclesCount,
    approvedAt: strategy.approvedAt,
  };
}

async function buildCycleCards(cycles: InvestmentCycle[]): Promise<InvestorCycleCard[]> {
  if (cycles.length === 0) return [];
  const strategyIds = [...new Set(cycles.map((c) => c.strategyId))];
  const strategies = await Promise.all(strategyIds.map((id) => strategyService.getById(id)));
  const strategyMap = new Map(
    strategies.filter(Boolean).map((s) => [s!.id, s!])
  );
  const managers = await loadManagers([...new Set(cycles.map((c) => c.poolManagerId))]);

  return cycles
    .map((cycle) => {
      const strategy = strategyMap.get(cycle.strategyId);
      if (!strategy) return null;
      return toCycleCard(cycle, strategy, managers.get(cycle.poolManagerId));
    })
    .filter((c): c is InvestorCycleCard => c != null);
}

async function buildStrategyCards(strategies: Strategy[]): Promise<InvestorStrategyCard[]> {
  if (strategies.length === 0) return [];
  const cycles = await investmentCycleService.listPublic();
  const managers = await loadManagers([...new Set(strategies.map((s) => s.poolManagerId))]);

  return strategies.map((strategy) => {
    const count = cycles.filter(
      (c) =>
        c.strategyId === strategy.id &&
        ["approved", "funding", "trading", "distribution"].includes(c.status)
    ).length;
    return toStrategyCard(strategy, managers.get(strategy.poolManagerId), count);
  });
}

async function enrichAllocations(allocations: InvestmentAllocation[]): Promise<InvestorAllocationView[]> {
  if (allocations.length === 0) return [];

  const cycleIds = [...new Set(allocations.map((a) => a.investmentCycleId))];
  const cycles = await Promise.all(cycleIds.map((id) => investmentCycleService.getById(id)));
  const cycleMap = new Map(cycles.filter(Boolean).map((c) => [c!.id, c!]));

  const strategyIds = [...new Set([...cycleMap.values()].map((c) => c.strategyId))];
  const strategies = await Promise.all(strategyIds.map((id) => strategyService.getById(id)));
  const strategyMap = new Map(strategies.filter(Boolean).map((s) => [s!.id, s!]));

  const managerIds = [...new Set([...cycleMap.values()].map((c) => c.poolManagerId))];
  const managers = await loadManagers(managerIds);

  return allocations.map((allocation) => {
    const cycle = cycleMap.get(allocation.investmentCycleId)!;
    const strategy = strategyMap.get(cycle.strategyId);
    const manager = managers.get(cycle.poolManagerId);
    const canCancel =
      allocation.status === "pending" && investmentCycleService.isAllocatable(cycle.status);

    return {
      id: allocation.id,
      amount: allocation.amount,
      currency: allocation.currency,
      status: allocation.status,
      referenceNumber: allocation.referenceNumber,
      allocatedAt: allocation.allocatedAt,
      cycleId: cycle.id,
      cycleName: cycle.name,
      cycleSlug: cycle.slug,
      cycleStatus: cycle.status,
      strategyName: strategy?.name ?? "Strategy",
      managerName: manager?.display_name ?? "Pool Manager",
      canCancel,
    };
  });
}

export const investorInvestmentService = {
  async buildCycleCardsFromList(cycles: InvestmentCycle[]): Promise<InvestorCycleCard[]> {
    return buildCycleCards(cycles);
  },

  async buildStrategyCardsFromList(strategies: Strategy[]): Promise<InvestorStrategyCard[]> {
    return buildStrategyCards(strategies);
  },

  async getHomeData(): Promise<InvestorHomeData> {
    await requireAuth();

    const [strategies, cycles, managers, wallet, allocations] = await Promise.all([
      strategyService.listPublic(),
      investmentCycleService.listPublic(),
      marketplaceService.getMarketplaceManagers(),
      walletService.getWalletSummary(),
      investmentAllocationService.listMine(),
    ]);

    const strategyCards = await buildStrategyCards(strategies);
    const cycleCards = await buildCycleCards(cycles);
    const allocationViews = await enrichAllocations(allocations);

    const fundingCycles = cycleCards.filter((c) => c.status === "funding");
    const recommended = [...fundingCycles]
      .sort((a, b) => (b.fundingPct ?? 0) - (a.fundingPct ?? 0))
      .slice(0, 6);

    const activeCycles = cycleCards.filter((c) =>
      ["approved", "funding", "trading", "distribution"].includes(c.status)
    );

    const recentStrategies = [...strategyCards]
      .sort((a, b) => {
        const aTime = a.approvedAt ? new Date(a.approvedAt).getTime() : 0;
        const bTime = b.approvedAt ? new Date(b.approvedAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 6);

    const featuredManagers = managers
      .sort((a, b) => (b.ryvonxRating ?? 0) - (a.ryvonxRating ?? 0))
      .slice(0, 4)
      .map((m) => ({
        id: m.id,
        slug: m.slug,
        displayName: m.displayName,
        ryvonxRating: m.ryvonxRating,
        assetsUnderManagement: m.assetsUnderManagement,
        activeInvestors: m.activeInvestors,
        tradingStyle: m.tradingStyle,
      }));

    const pendingAllocations = allocationViews.filter((a) => a.status === "pending");
    const legacyInvested = wallet.participations.reduce((s, p) => s + p.amountInvested, 0);
    const cycleCommitted = allocationViews
      .filter((a) => a.status !== "cancelled")
      .reduce((sum, a) => sum + a.amount, 0);

    return {
      recommendedCycles: recommended,
      featuredManagers,
      activeCycles: activeCycles.slice(0, 8),
      recentStrategies,
      pendingAllocations,
      portfolioSummary: {
        balance: wallet.balance,
        legacyInvested,
        cycleCommitted,
        pendingCount: pendingAllocations.length,
      },
    };
  },

  async getPortfolio(): Promise<InvestorPortfolioData> {
    await requireAuth();

    const [wallet, allocations] = await Promise.all([
      walletService.getWalletSummary(),
      investmentAllocationService.listMine(),
    ]);

    const allocationViews = await enrichAllocations(allocations);
    const active = allocationViews.filter(
      (a) => a.status !== "cancelled" && a.status !== "distributed"
    );
    const pending = allocationViews.filter((a) => a.status === "pending");
    const totalCommitted = active.reduce((sum, a) => sum + a.amount, 0);
    const legacyInvested = wallet.participations.reduce((s, p) => s + p.amountInvested, 0);

    const riskMap = new Map<string, number>();
    const strategyMap = new Map<string, { amount: number; cycles: Set<string> }>();

    for (const allocation of active) {
      const cycle = await investmentCycleService.getById(allocation.cycleId);
      if (!cycle) continue;
      const strategy = await strategyService.getById(cycle.strategyId);
      const risk = strategy?.riskProfile ?? "unknown";
      riskMap.set(risk, (riskMap.get(risk) ?? 0) + allocation.amount);

      const entry = strategyMap.get(allocation.strategyName) ?? { amount: 0, cycles: new Set() };
      entry.amount += allocation.amount;
      entry.cycles.add(allocation.cycleId);
      strategyMap.set(allocation.strategyName, entry);
    }

    const totalExposure = totalCommitted + legacyInvested;
    const riskExposure = [...riskMap.entries()].map(([label, amount]) => ({
      label: label.replace(/_/g, " "),
      amount,
      pct: totalExposure > 0 ? Math.round((amount / totalExposure) * 1000) / 10 : 0,
    }));

    const strategyExposure = [...strategyMap.entries()].map(([strategyName, data]) => ({
      strategyName,
      amount: data.amount,
      cycleCount: data.cycles.size,
    }));

    const timeline = [
      ...active.map((a) => ({
        label: `${a.cycleName} — ${INVESTMENT_ALLOCATION_STATUS_LABELS[a.status]}`,
        date: a.allocatedAt,
        type: "allocation" as const,
      })),
      ...wallet.participations.map((p) => ({
        label: `${p.poolName} — Legacy pool`,
        date: p.investmentStartDate ?? new Date().toISOString(),
        type: "legacy" as const,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      balance: wallet.balance,
      totalInvestedLegacy: legacyInvested,
      totalCommittedCycles: totalCommitted,
      pendingAllocations: pending,
      activeAllocations: active.filter((a) => a.status !== "pending"),
      legacyParticipations: wallet.participations,
      riskExposure,
      strategyExposure,
      timeline: timeline.slice(0, 20),
    };
  },
};
