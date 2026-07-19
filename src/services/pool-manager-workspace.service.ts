import { poolManagerDashboardService } from "@/services/pool-manager-dashboard.service";
import { strategyService } from "@/services/strategy.service";
import { investmentCycleService } from "@/services/investment-cycle.service";
import type { InvestmentCycle, Strategy } from "@/domain/investment/types";

export interface PoolManagerWorkspaceActivity {
  id: string;
  type: "strategy" | "cycle";
  title: string;
  status: string;
  timestamp: string;
  href: string;
}

export interface PoolManagerWorkspaceDashboard {
  poolStats: Awaited<ReturnType<typeof poolManagerDashboardService.getDashboardStats>>;
  strategies: Strategy[];
  cycles: InvestmentCycle[];
  activeStrategies: Strategy[];
  draftStrategies: Strategy[];
  submittedStrategies: Strategy[];
  activeCycles: InvestmentCycle[];
  draftCycles: InvestmentCycle[];
  closedCycles: InvestmentCycle[];
  pendingReviews: number;
  recentActivity: PoolManagerWorkspaceActivity[];
}

const ACTIVE_STRATEGY_STATUSES = new Set(["approved", "available", "operating"]);
const SUBMITTED_STRATEGY_STATUSES = new Set(["submitted", "under_review"]);
const ACTIVE_CYCLE_STATUSES = new Set(["approved", "funding", "trading", "distribution"]);
const CLOSED_CYCLE_STATUSES = new Set(["completed", "archived"]);
const APPROVED_POOL_STATUSES = new Set(["approved", "live"]);

export interface PoolManagerQuickActionContext {
  hasStrategy: boolean;
  hasApprovedStrategy: boolean;
  hasApprovedPool: boolean;
  hasActiveCycle: boolean;
  activeCycleId: string | null;
  approvedPoolId: string | null;
}

export const poolManagerWorkspaceService = {
  async getQuickActionContext(): Promise<PoolManagerQuickActionContext> {
    const { managedPoolService } = await import("@/services/managed-pool.service");
    const [strategies, cycles, pools] = await Promise.all([
      strategyService.listMine(),
      investmentCycleService.listMine(),
      managedPoolService.listMine(),
    ]);

    const hasApprovedStrategy = strategies.some((s) =>
      ACTIVE_STRATEGY_STATUSES.has(s.status)
    );
    const approvedPool = pools.find((p) =>
      APPROVED_POOL_STATUSES.has(p.lifecycleStatus ?? "")
    );
    const activeCycle = cycles.find((c) => ACTIVE_CYCLE_STATUSES.has(c.status));

    return {
      hasStrategy: strategies.length > 0,
      hasApprovedStrategy,
      hasApprovedPool: Boolean(approvedPool),
      hasActiveCycle: Boolean(activeCycle),
      activeCycleId: activeCycle?.id ?? null,
      approvedPoolId: approvedPool?.id ?? null,
    };
  },

  async getDashboard(): Promise<PoolManagerWorkspaceDashboard> {
    const [poolStats, strategies, cycles] = await Promise.all([
      poolManagerDashboardService.getDashboardStats(),
      strategyService.listMine(),
      investmentCycleService.listMine(),
    ]);

    const activeStrategies = strategies.filter((s) => ACTIVE_STRATEGY_STATUSES.has(s.status));
    const draftStrategies = strategies.filter((s) => s.status === "draft");
    const submittedStrategies = strategies.filter((s) =>
      SUBMITTED_STRATEGY_STATUSES.has(s.status)
    );

    const activeCycles = cycles.filter((c) => ACTIVE_CYCLE_STATUSES.has(c.status));
    const draftCycles = cycles.filter((c) => c.status === "draft");
    const closedCycles = cycles.filter((c) => CLOSED_CYCLE_STATUSES.has(c.status));

    const pendingReviews =
      submittedStrategies.length + cycles.filter((c) => c.status === "submitted").length;

    const recentActivity = buildRecentActivity(strategies, cycles);

    return {
      poolStats,
      strategies,
      cycles,
      activeStrategies,
      draftStrategies,
      submittedStrategies,
      activeCycles,
      draftCycles,
      closedCycles,
      pendingReviews,
      recentActivity,
    };
  },
};

function buildRecentActivity(
  strategies: Strategy[],
  cycles: InvestmentCycle[]
): PoolManagerWorkspaceActivity[] {
  const items: PoolManagerWorkspaceActivity[] = [
    ...strategies.map((s) => ({
      id: s.id,
      type: "strategy" as const,
      title: s.name,
      status: s.status,
      timestamp: s.updatedAt,
      href: `/pool-manager/strategies/${s.id}`,
    })),
    ...cycles.map((c) => ({
      id: c.id,
      type: "cycle" as const,
      title: c.name,
      status: c.status,
      timestamp: c.updatedAt,
      href: `/pool-manager/investment-cycles/${c.id}`,
    })),
  ];

  return items
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);
}
