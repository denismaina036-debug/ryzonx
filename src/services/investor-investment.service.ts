import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePoolManagerPublicLabel, managerRowToIdentity } from "@/domain/pool-manager/public-profile";
import { requireAuth } from "@/lib/auth/session";
import { strategyService } from "@/services/strategy.service";
import { investmentCycleService } from "@/services/investment-cycle.service";
import { investmentAllocationService } from "@/services/investment-allocation.service";
import { marketplaceService } from "@/services/marketplace.service";
import { walletService } from "@/services/wallet.service";
import { cycleProgressService } from "@/services/cycle-progress.service";
import { tradeEntryService } from "@/services/trade-entry.service";
import { platformInvestmentLevelService } from "@/services/platform-investment-level.service";
import { poolRoiService } from "@/services/pool-roi.service";
import { ROUTES } from "@/constants/routes";
import { formatExpectedDurationLabel } from "@/features/marketplace/utils/marketplace-pool-card-presentation";
import {
  multiplierToDisplayPct,
  resolveRoiMultiplier,
} from "@/features/investor/types/pool-participation";
import { isCycleFundingPhase, isCycleTradingPhase } from "@/lib/investment/cycle-display-phase";
import type { ManagedPoolConfig } from "@/domain/pools/managed-pool";
import type { InvestmentAllocation, InvestmentCycle, Strategy } from "@/domain/investment/types";
import type {
  InvestorAllocationView,
  InvestorCycleCard,
  InvestorHomeData,
  InvestorPoolCyclesData,
  InvestorPortfolioData,
  InvestorStrategyCard,
} from "@/domain/investment/investor-presentation";
import { INVESTMENT_ALLOCATION_STATUS_LABELS } from "@/constants/investment-allocation";
import { resolveInvestorCapitalExposure } from "@/domain/investment/investor-pool-participation";
import { computeInvestorOwnershipShare } from "@/domain/investment/cycle-metrics";
import { resolveMergedManagerRating } from "@/lib/pool-manager/merge-admin-statistics";

type ManagerRow = {
  id: string;
  username?: string | null;
  slug: string | null;
  display_name: string;
  show_full_name?: boolean | null;
  ryvonx_rating: number | null;
  security_rating?: number | null;
  aggressiveness_rating?: number | null;
  admin_statistics?: Record<string, unknown> | null;
};

function managerPublicName(row: ManagerRow | undefined): string {
  if (!row) return "Pool Manager";
  return resolvePoolManagerPublicLabel(managerRowToIdentity(row));
}

async function loadManagers(ids: string[]): Promise<Map<string, ManagerRow>> {
  if (ids.length === 0) return new Map();
  const db = createAdminClient();
  const { data } = await db
    .from("pool_managers")
    .select(
      "id, username, slug, display_name, show_full_name, ryvonx_rating, security_rating, aggressiveness_rating, admin_statistics"
    )
    .in("id", ids);

  const map = new Map<string, ManagerRow>();
  for (const row of ((data ?? []) as unknown) as ManagerRow[]) {
    map.set(row.id, row);
  }
  return map;
}

function fundingPct(cycle: InvestmentCycle): number | null {
  if (cycle.fundingProgressPct != null) return cycle.fundingProgressPct;
  if (cycle.targetCapital == null || cycle.targetCapital <= 0) return null;
  return Math.min(100, Math.round((cycle.raisedCapital / cycle.targetCapital) * 1000) / 10);
}

function remainingCapacity(cycle: InvestmentCycle): number | null {
  if (cycle.remainingCapital != null) return cycle.remainingCapital;
  if (cycle.targetCapital == null || cycle.targetCapital <= 0) return null;
  return Math.max(0, cycle.targetCapital - cycle.raisedCapital);
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
    managerName: managerPublicName(manager),
    managerSlug: manager?.slug ?? null,
    managerRating: resolveMergedManagerRating(manager),
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
    managerName: managerPublicName(manager),
    managerSlug: manager?.slug ?? null,
    managerRating: resolveMergedManagerRating(manager),
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
      fundId: cycle.fundId ?? "",
      strategyName: strategy?.name ?? "Strategy",
      managerName: managerPublicName(manager),
      canCancel,
      ownershipSharePct: computeInvestorOwnershipShare(allocation.amount, cycle.targetCapital),
      returnedCapitalAmount: allocation.returnedCapitalAmount,
      returnableCapitalAmount: Math.max(0, allocation.amount - allocation.returnedCapitalAmount),
      capitalReturnedAt: allocation.capitalReturnedAt,
    };
  });
}

function readManagedConfig(poolFaq: unknown): ManagedPoolConfig {
  if (!poolFaq || typeof poolFaq !== "object" || Array.isArray(poolFaq)) return {};
  const faq = poolFaq as { managedPool?: ManagedPoolConfig };
  return faq.managedPool ?? {};
}

function formatTradingScheduleLabel(cycle: InvestmentCycle): string | null {
  if (cycle.durationDays != null && cycle.durationDays > 0) {
    return `${cycle.durationDays} Days`;
  }
  const snapshotDays = cycle.poolConfigSnapshot?.pool.poolDurationDays;
  if (snapshotDays != null && snapshotDays > 0) {
    return `${snapshotDays} Days`;
  }
  return null;
}

const ACTIVE_ALLOCATION_STATUSES = new Set([
  "pending",
  "funding_confirmed",
  "confirmed",
  "settled",
  "locked",
]);

const CLOSED_ALLOCATION_STATUSES = new Set([
  "funding_confirmed",
  "confirmed",
  "settled",
  "locked",
  "distributed",
]);

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
    const exposureAllocations = allocationViews.filter(
      (a) => a.status !== "cancelled" && a.status !== "rejected"
    );
    const cycleCommitted = resolveInvestorCapitalExposure(
      wallet.participations,
      exposureAllocations.map((allocation) => ({
        fundId: allocation.fundId,
        amount: allocation.amount,
        returnedCapitalAmount: allocation.returnedCapitalAmount,
        status: allocation.status,
      }))
    );

    return {
      fundingCycleCount: fundingCycles.length,
      recommendedCycles: recommended,
      featuredManagers,
      activeCycles: activeCycles.slice(0, 8),
      recentStrategies,
      pendingAllocations,
      portfolioSummary: {
        balance: wallet.balance,
        legacyInvested: wallet.participations.reduce((sum, p) => sum + p.amountInvested, 0),
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
      (a) =>
        a.status !== "cancelled" &&
        a.status !== "distributed" &&
        a.returnableCapitalAmount > 0
    );
    const exposureAllocations = allocationViews.filter(
      (a) => a.status !== "cancelled" && a.status !== "rejected"
    );
    const pending = allocationViews.filter((a) => a.status === "pending");
    const legacyInvested = wallet.participations.reduce((s, p) => s + p.amountInvested, 0);
    const totalCommitted = resolveInvestorCapitalExposure(
      wallet.participations,
      exposureAllocations.map((allocation) => ({
        fundId: allocation.fundId,
        amount: allocation.amount,
        returnedCapitalAmount: allocation.returnedCapitalAmount,
        status: allocation.status,
      }))
    );

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

    const totalExposure = totalCommitted;
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

  async getPoolCycles(): Promise<InvestorPoolCyclesData> {
    const user = await requireAuth();

    const [wallet, allocations, investmentLevels] = await Promise.all([
      walletService.getWalletSummary(),
      investmentAllocationService.listMine(),
      platformInvestmentLevelService.listActive(),
    ]);

    const allocationViews = await enrichAllocations(allocations);
    const allocationByCycleId = new Map(allocationViews.map((a) => [a.cycleId, a]));

    const fundIds = new Set<string>();
    for (const participation of wallet.participations) {
      fundIds.add(participation.fundId);
    }

    const investorCycleIds = [...new Set(allocations.map((a) => a.investmentCycleId))];
    const investorCycles = (
      await Promise.all(investorCycleIds.map((id) => investmentCycleService.getById(id)))
    ).filter((c): c is InvestmentCycle => c != null);

    for (const cycle of investorCycles) {
      if (cycle.fundId) fundIds.add(cycle.fundId);
    }

    if (fundIds.size === 0) {
      return { context: null, funding: null, trading: null, closed: [] };
    }

    const fundIdList = [...fundIds];
    const [fundRows, cyclesByFund] = await Promise.all([
      createAdminClient()
        .from("funds")
        .select("id, name, pool_duration_days, pool_faq, return_duration_unit")
        .in("id", fundIdList)
        .then(({ data, error }) => {
          if (error) throw new Error(error.message);
          return (data ?? []) as Array<{
            id: string;
            name: string;
            pool_duration_days: number | null;
            pool_faq: unknown;
            return_duration_unit: string | null;
          }>;
        }),
      Promise.all(fundIdList.map((fundId) => investmentCycleService.listByFund(fundId))),
    ]);

    const fundMap = new Map(fundRows.map((f) => [f.id, f]));
    const allCycles = cyclesByFund.flat();

    function investorExposureInFund(fundId: string): number {
      const legacy =
        wallet.participations.find((p) => p.fundId === fundId)?.amountInvested ?? 0;
      const cycleTotal = allocationViews
        .filter((a) => {
          const cycle = allCycles.find((c) => c.id === a.cycleId);
          return (
            cycle?.fundId === fundId &&
            a.status !== "cancelled" &&
            a.status !== "rejected" &&
            a.returnableCapitalAmount > 0
          );
        })
        .reduce((sum, a) => sum + a.returnableCapitalAmount, 0);
      return legacy + cycleTotal;
    }

    const primaryFundId = fundIdList.reduce((best, fid) =>
      investorExposureInFund(fid) > investorExposureInFund(best) ? fid : best
    );

    const primaryFund = fundMap.get(primaryFundId);
    const primaryCycles = cyclesByFund[fundIdList.indexOf(primaryFundId)] ?? [];
    const managed = readManagedConfig(primaryFund?.pool_faq);
    const payoutDurationLabel = formatExpectedDurationLabel(
      primaryFund?.pool_duration_days ?? null,
      managed.durationUnit ?? primaryFund?.return_duration_unit,
      managed.payoutDurationPreset
    );

    const primaryParticipation = wallet.participations.find((p) => p.fundId === primaryFundId);

    const fundingCycle = [...primaryCycles]
      .filter((c) => isCycleFundingPhase(c.status))
      .sort((a, b) => b.cycleNumber - a.cycleNumber)[0];

    const tradingCycle = [...primaryCycles]
      .filter((c) => {
        if (!isCycleTradingPhase(c.status)) return false;
        const allocation = allocationByCycleId.get(c.id);
        return (
          allocation != null &&
          allocation.returnableCapitalAmount > 0 &&
          ACTIVE_ALLOCATION_STATUSES.has(allocation.status)
        );
      })
      .sort((a, b) => b.cycleNumber - a.cycleNumber)[0];

    const closedCycles = [...primaryCycles]
      .filter((c) => c.status === "completed" || c.status === "archived")
      .filter((c) => {
        const allocation = allocationByCycleId.get(c.id);
        return allocation != null && CLOSED_ALLOCATION_STATUSES.has(allocation.status);
      })
      .sort((a, b) => b.cycleNumber - a.cycleNumber);

    let funding: InvestorPoolCyclesData["funding"] = null;
    if (fundingCycle) {
      const cards = await buildCycleCards([fundingCycle]);
      const card = cards[0];
      if (card) {
        const allocation = allocationByCycleId.get(fundingCycle.id);
        const investAmount =
          allocation?.amount ??
          fundingCycle.minInvestment ??
          primaryParticipation?.amountInvested ??
          null;
        const cycleMultipliers = await poolRoiService.getMultipliersForCycle(fundingCycle);
        const projectedMultiplier =
          investAmount != null && investAmount > 0
            ? resolveRoiMultiplier(investAmount, investmentLevels, cycleMultipliers)
            : primaryParticipation?.projectedRoiMultiplier ?? null;

        funding = {
          cycle: card,
          investorAmount: investAmount,
          ownershipSharePct: allocation?.ownershipSharePct ?? null,
          payoutDurationLabel,
          tradingScheduleLabel: formatTradingScheduleLabel(fundingCycle),
          projectedMultiplier,
          projectedReturnPct: multiplierToDisplayPct(projectedMultiplier),
          commitHref: `${ROUTES.marketplaceCycles}/${fundingCycle.slug}/commit`,
        };
      }
    }

    let trading: InvestorPoolCyclesData["trading"] = null;
    if (tradingCycle) {
      const allocation = allocationByCycleId.get(tradingCycle.id);
      const operations = await cycleProgressService.getInvestorViewBySlug(tradingCycle.slug, {
        investorUserId: user.id,
      });
      if (operations && allocation) {
        trading = {
          cycleId: tradingCycle.id,
          cycleSlug: tradingCycle.slug,
          cycleName: tradingCycle.name,
          investorAmount: allocation.amount,
          ownershipSharePct: allocation.ownershipSharePct,
          initialOperations: operations,
        };
      }
    }

    const closed = await Promise.all(
      closedCycles.map(async (cycle) => {
        const allocation = allocationByCycleId.get(cycle.id)!;
        const trades = await tradeEntryService.listPublicClosedByCycle(cycle.id);
        return {
          id: cycle.id,
          slug: cycle.slug,
          name: cycle.name,
          cycleNumber: cycle.cycleNumber,
          completedAt: cycle.completedAt ?? cycle.closingDate,
          capitalTraded: cycle.raisedCapital,
          profitRealized: cycle.currentCycleProfit,
          tradeCount: trades.length,
          investorCount: cycle.investorCount,
          investorAmount: allocation.amount,
          trades,
        };
      })
    );

    return {
      context: primaryFund
        ? { poolName: primaryFund.name, fundId: primaryFundId }
        : null,
      funding,
      trading,
      closed,
    };
  },
};
