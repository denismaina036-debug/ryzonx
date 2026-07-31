import { createAdminClient } from "@/lib/supabase/admin";
import { ROUTES } from "@/constants/routes";
import { revalidatePath } from "next/cache";
import type { PoolManagerAdminStatistics } from "@/domain/pool-manager/admin-statistics";
import {
  POOL_MANAGER_DYNAMIC_PERFORMANCE_FIELDS,
  type PoolManagerLivePerformanceStatistics,
} from "@/domain/pool-manager/live-performance-statistics";
import {
  computePoolManagerPerformanceStats,
  type CyclePerformanceInput,
  type TradeEntryPerformanceInput,
} from "@/lib/pool-manager/compute-performance-stats";
import { mergeLivePerformanceWithAdminBaseline } from "@/lib/pool-manager/merge-live-performance-with-baseline";
import { ratingEngineService } from "@/services/rating-engine.service";

type ManagerRow = {
  id: string;
  slug: string | null;
  admin_statistics: PoolManagerAdminStatistics | null;
  win_rate_pct: number | null;
};

function readManagerRow(data: unknown): ManagerRow {
  return data as ManagerRow;
}

function readAdminStats(row: ManagerRow): PoolManagerAdminStatistics {
  const raw = row.admin_statistics;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw;
}

function revalidateManagerSurfaces(slug: string | null): void {
  revalidatePath(ROUTES.marketplace);
  revalidatePath(ROUTES.marketplaceStrategies);
  revalidatePath(ROUTES.marketplaceCycles);
  revalidatePath(ROUTES.dashboard);
  if (slug) {
    revalidatePath(`${ROUTES.managerPublicProfile}/${slug}`);
  }
}

async function loadTradeInputs(managerId: string): Promise<TradeEntryPerformanceInput[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("trade_entries")
    .select("status, trade_result, realized_pnl, opened_at, closed_at")
    .eq("pool_manager_id", managerId);

  if (error) throw new Error(error.message);

  return ((data ?? []) as Array<{
    status: TradeEntryPerformanceInput["status"];
    trade_result: TradeEntryPerformanceInput["tradeResult"];
    realized_pnl: number | string | null;
    opened_at: string | null;
    closed_at: string | null;
  }>).map((row) => ({
    status: row.status,
    tradeResult: row.trade_result,
    realizedPnl:
      row.realized_pnl == null
        ? null
        : typeof row.realized_pnl === "number"
          ? row.realized_pnl
          : Number(row.realized_pnl),
    openedAt: row.opened_at,
    closedAt: row.closed_at,
  }));
}

async function loadCycleInputs(managerId: string): Promise<CyclePerformanceInput[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("investment_cycles")
    .select("status, current_cycle_profit")
    .eq("pool_manager_id", managerId);

  if (error) throw new Error(error.message);

  return ((data ?? []) as Array<{
    status: string;
    current_cycle_profit: number | string;
  }>).map((row) => ({
    status: row.status,
    currentCycleProfit:
      typeof row.current_cycle_profit === "number"
        ? row.current_cycle_profit
        : Number(row.current_cycle_profit),
  }));
}

function buildColumnPatch(
  adminStats: PoolManagerAdminStatistics,
  stats: PoolManagerLivePerformanceStatistics,
  overrides: PoolManagerAdminStatistics["performanceStatOverrides"]
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};

  if (!overrides?.includes("winRatePct") && stats.closedTrades > 0) {
    const merged = mergeLivePerformanceWithAdminBaseline(adminStats, stats);
    patch.win_rate_pct = merged.winRatePct;
  }

  return patch;
}

export const poolManagerPerformanceStatsService = {
  async computeForManager(managerId: string): Promise<PoolManagerLivePerformanceStatistics> {
    const [trades, cycles] = await Promise.all([
      loadTradeInputs(managerId),
      loadCycleInputs(managerId),
    ]);

    return computePoolManagerPerformanceStats({ trades, cycles });
  },

  async syncManager(
    managerId: string,
    reason = "Trade activity updated manager performance statistics"
  ): Promise<PoolManagerLivePerformanceStatistics> {
    const db = createAdminClient();
    const stats = await this.computeForManager(managerId);

    const { data, error } = await db
      .from("pool_managers")
      .select("id, slug, admin_statistics, win_rate_pct")
      .eq("id", managerId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("Pool Manager not found.");

    const row = readManagerRow(data);
    const adminStats = readAdminStats(row);
    const overrides = adminStats.performanceStatOverrides ?? [];

    const nextAdminStats: PoolManagerAdminStatistics = {
      ...adminStats,
      livePerformance: stats,
    };

    const updatePatch: Record<string, unknown> = {
      admin_statistics: nextAdminStats,
    };

    if (stats.closedTrades > 0) {
      await ratingEngineService
        .recalculateManager(managerId, reason)
        .catch(() => undefined);
    }

    Object.assign(
      updatePatch,
      buildColumnPatch(adminStats, stats, overrides)
    );

    const { error: updateError } = await db
      .from("pool_managers")
      .update(updatePatch as never)
      .eq("id", managerId);

    if (updateError) throw new Error(updateError.message);

    revalidateManagerSurfaces(row.slug);

    return stats;
  },

  /** Map live performance into published admin-stat field values. */
  mapLivePerformanceToAdminFields(
    adminStats: PoolManagerAdminStatistics,
    stats: PoolManagerLivePerformanceStatistics | null | undefined
  ): Partial<PoolManagerAdminStatistics> {
    return mergeLivePerformanceWithAdminBaseline(adminStats, stats);
  },

  dynamicPerformanceFields: POOL_MANAGER_DYNAMIC_PERFORMANCE_FIELDS,
};
