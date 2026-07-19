import { createAdminClient } from "@/lib/supabase/admin";
import { computeOperationalMetrics } from "@/lib/trading-journal/metrics";
import type { TradeEntry } from "@/domain/trading-journal/types";
import type { IntelligenceMetrics } from "@/lib/performance-intelligence/scoring";
import type { InvestmentCycle, Strategy } from "@/domain/investment/types";

type EntryRow = {
  id: string;
  investment_cycle_id: string;
  status: string;
  entry_price: string | number;
  exit_price: string | number | null;
  quantity: string | number;
  direction: string;
  opened_at: string | null;
  closed_at: string | null;
};

function mapEntry(row: EntryRow): TradeEntry {
  const toNum = (v: string | number | null) => (typeof v === "number" ? v : v != null ? Number(v) : 0);
  return {
    id: row.id,
    journalId: "",
    investmentCycleId: row.investment_cycle_id,
    poolManagerId: "",
    tradeReference: "",
    instrument: "",
    market: null,
    direction: row.direction as TradeEntry["direction"],
    entryPrice: toNum(row.entry_price),
    exitPrice: row.exit_price != null ? toNum(row.exit_price) : null,
    quantity: toNum(row.quantity),
    status: row.status as TradeEntry["status"],
    notes: null,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    createdBy: null,
    updatedBy: null,
    createdAt: "",
    updatedAt: "",
  };
}

async function loadTradeEntriesForManager(managerId: string): Promise<TradeEntry[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("trade_entries")
    .select("id, investment_cycle_id, status, entry_price, exit_price, quantity, direction, opened_at, closed_at")
    .eq("pool_manager_id", managerId);

  if (error || !data) return [];
  return (data as EntryRow[]).map(mapEntry);
}

async function countSnapshots(managerId: string): Promise<number> {
  const db = createAdminClient();
  const { count } = await db
    .from("trade_snapshots")
    .select("id", { count: "exact", head: true })
    .eq("pool_manager_id", managerId);
  return count ?? 0;
}

async function countProgressEvents(managerId: string, eventType?: "operational_flag"): Promise<number> {
  const db = createAdminClient();
  const { data: cycles } = await db
    .from("investment_cycles")
    .select("id")
    .eq("pool_manager_id", managerId);
  const cycleIds = ((cycles ?? []) as Array<{ id: string }>).map((c) => c.id);
  if (cycleIds.length === 0) return 0;

  let query = db
    .from("cycle_progress_events")
    .select("id", { count: "exact", head: true })
    .in("investment_cycle_id", cycleIds);
  if (eventType) query = query.eq("event_type", eventType);
  const { count } = await query;
  return count ?? 0;
}

export const performanceIntelligenceService = {
  async getManagerMetrics(managerId: string): Promise<IntelligenceMetrics> {
    const db = createAdminClient();

    const [manager, cycles, entries, snapshotCount, flagCount, journalEvents] = await Promise.all([
      db.from("pool_managers").select("governance_stage, max_drawdown_pct").eq("id", managerId).maybeSingle(),
      db.from("investment_cycles").select("*").eq("pool_manager_id", managerId),
      loadTradeEntriesForManager(managerId),
      countSnapshots(managerId),
      countProgressEvents(managerId, "operational_flag"),
      countProgressEvents(managerId),
    ]);

    const cycleRows = ((cycles.data ?? []) as Array<{
      status: string;
      raised_capital: number | string;
      investor_count: number;
      trading_started_at: string | null;
      completed_at: string | null;
      target_capital: number | string | null;
    }>);
    const ops = computeOperationalMetrics(entries);
    const completedCycles = cycleRows.filter((c) => c.status === "completed" || c.status === "archived").length;
    const totalCycles = cycleRows.length;
    const totalRaised = cycleRows.reduce((s, c) => s + Number(c.raised_capital), 0);
    const totalInvestors = cycleRows.reduce((s, c) => s + c.investor_count, 0);
    const fundedCycles = cycleRows.filter(
      (c) => Number(c.raised_capital) > 0 && !["draft", "submitted"].includes(c.status)
    ).length;

    const durations = cycleRows
      .filter((c) => c.trading_started_at && c.completed_at)
      .map((c) => {
        const ms = new Date(c.completed_at!).getTime() - new Date(c.trading_started_at!).getTime();
        return ms / (1000 * 60 * 60 * 24);
      });

    const mgr = manager.data as { governance_stage?: string; max_drawdown_pct?: number | null } | null;

    return {
      closedTrades: ops.closedPositions,
      winningTrades: ops.winningTrades,
      losingTrades: ops.losingTrades,
      winRate: ops.closedPositions > 0 ? ops.winningTrades / ops.closedPositions : 0,
      openPositions: ops.openPositions,
      totalTrades: ops.totalTrades,
      snapshotCount,
      journalEventCount: journalEvents,
      operationalFlags: flagCount,
      governanceViolations: 0,
      governanceStage: mgr?.governance_stage ?? "active",
      completedCycles,
      totalCycles,
      completionRate: totalCycles > 0 ? completedCycles / totalCycles : 0,
      totalRaisedCapital: totalRaised,
      totalInvestors,
      fundingSuccessRate: totalCycles > 0 ? fundedCycles / totalCycles : 0,
      averageCycleDurationDays:
        durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null,
      currentExposure: ops.currentExposure,
      maxDrawdownPct: mgr?.max_drawdown_pct ?? null,
    };
  },

  async getStrategyMetrics(strategy: Strategy, cycles: InvestmentCycle[]): Promise<IntelligenceMetrics> {
    const db = createAdminClient();
    const cycleIds = cycles.map((c) => c.id);
    let entries: TradeEntry[] = [];
    if (cycleIds.length > 0) {
      const { data } = await db
        .from("trade_entries")
        .select("id, investment_cycle_id, status, entry_price, exit_price, quantity, direction, opened_at, closed_at")
        .in("investment_cycle_id", cycleIds);
      entries = ((data ?? []) as EntryRow[]).map(mapEntry);
    }

    const ops = computeOperationalMetrics(entries);
    const completed = cycles.filter((c) => c.status === "completed" || c.status === "archived").length;

    return {
      closedTrades: ops.closedPositions,
      winningTrades: ops.winningTrades,
      losingTrades: ops.losingTrades,
      winRate: ops.closedPositions > 0 ? ops.winningTrades / ops.closedPositions : 0,
      openPositions: ops.openPositions,
      totalTrades: ops.totalTrades,
      snapshotCount: 0,
      journalEventCount: ops.totalTrades,
      operationalFlags: 0,
      governanceViolations: 0,
      governanceStage: "active",
      completedCycles: completed,
      totalCycles: cycles.length,
      completionRate: cycles.length > 0 ? completed / cycles.length : 0,
      totalRaisedCapital: cycles.reduce((s, c) => s + c.raisedCapital, 0),
      totalInvestors: cycles.reduce((s, c) => s + c.investorCount, 0),
      fundingSuccessRate:
        cycles.length > 0
          ? cycles.filter((c) => c.raisedCapital > 0).length / cycles.length
          : 0,
      averageCycleDurationDays: null,
      currentExposure: ops.currentExposure,
      maxDrawdownPct: null,
    };
  },

  async getCycleMetrics(cycle: InvestmentCycle): Promise<IntelligenceMetrics> {
    const db = createAdminClient();
    const { data } = await db
      .from("trade_entries")
      .select("id, investment_cycle_id, status, entry_price, exit_price, quantity, direction, opened_at, closed_at")
      .eq("investment_cycle_id", cycle.id);

    const entries = ((data ?? []) as EntryRow[]).map(mapEntry);
    const ops = computeOperationalMetrics(entries);

    const { count: snapshotCount } = await db
      .from("trade_snapshots")
      .select("id", { count: "exact", head: true })
      .eq("investment_cycle_id", cycle.id);

    const { count: eventCount } = await db
      .from("cycle_progress_events")
      .select("id", { count: "exact", head: true })
      .eq("investment_cycle_id", cycle.id);

    const isComplete = cycle.status === "completed" || cycle.status === "archived";

    return {
      closedTrades: ops.closedPositions,
      winningTrades: ops.winningTrades,
      losingTrades: ops.losingTrades,
      winRate: ops.closedPositions > 0 ? ops.winningTrades / ops.closedPositions : 0,
      openPositions: ops.openPositions,
      totalTrades: ops.totalTrades,
      snapshotCount: snapshotCount ?? 0,
      journalEventCount: eventCount ?? 0,
      operationalFlags: 0,
      governanceViolations: 0,
      governanceStage: "active",
      completedCycles: isComplete ? 1 : 0,
      totalCycles: 1,
      completionRate: isComplete ? 1 : 0,
      totalRaisedCapital: cycle.raisedCapital,
      totalInvestors: cycle.investorCount,
      fundingSuccessRate: cycle.targetCapital && cycle.targetCapital > 0
        ? Math.min(1, cycle.raisedCapital / cycle.targetCapital)
        : cycle.raisedCapital > 0 ? 1 : 0,
      averageCycleDurationDays: cycle.durationDays,
      currentExposure: ops.currentExposure,
      maxDrawdownPct: null,
    };
  },
};
