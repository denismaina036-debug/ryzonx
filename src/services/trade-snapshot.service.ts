import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import {
  TRADE_SNAPSHOT_ENTITY_TYPE,
  TRADING_JOURNAL_AUDIT_ACTIONS,
} from "@/constants/trading-journal";
import { auditService } from "@/services/audit.service";
import { tradingJournalService } from "@/services/trading-journal.service";
import { tradeEntryService } from "@/services/trade-entry.service";
import { cycleProgressService } from "@/services/cycle-progress.service";
import { computeOperationalMetrics } from "@/lib/trading-journal/metrics";
import type { TradeSnapshot } from "@/domain/trading-journal/types";

type SnapshotRow = {
  id: string;
  journal_id: string;
  investment_cycle_id: string;
  pool_manager_id: string;
  snapshot_at: string;
  open_positions_count: number;
  closed_positions_count: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  average_holding_hours: string | number | null;
  current_exposure: string | number | null;
  metrics: Record<string, unknown>;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

function toNumber(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  return typeof value === "number" ? value : Number(value);
}

function mapSnapshot(row: SnapshotRow): TradeSnapshot {
  return {
    id: row.id,
    journalId: row.journal_id,
    investmentCycleId: row.investment_cycle_id,
    poolManagerId: row.pool_manager_id,
    snapshotAt: row.snapshot_at,
    openPositionsCount: row.open_positions_count,
    closedPositionsCount: row.closed_positions_count,
    totalTrades: row.total_trades,
    winningTrades: row.winning_trades,
    losingTrades: row.losing_trades,
    averageHoldingHours: toNumber(row.average_holding_hours),
    currentExposure: toNumber(row.current_exposure),
    metrics: row.metrics ?? {},
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

async function getManagerIdForUser(userId: string): Promise<string | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("pool_managers")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "approved")
    .maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

async function requireManagerId(): Promise<{ userId: string; managerId: string }> {
  const user = await requireRole(USER_ROLES.POOL_MANAGER);
  const managerId = await getManagerIdForUser(user.id);
  if (!managerId) throw new Error("Pool Manager profile not found.");
  return { userId: user.id, managerId };
}

export const tradeSnapshotService = {
  async listByCycle(cycleId: string, actor: "manager" | "admin" = "manager"): Promise<TradeSnapshot[]> {
    if (actor === "admin") {
      await requireRole(USER_ROLES.ADMINISTRATOR);
    } else {
      await requireManagerId();
      await tradingJournalService.getForManager(cycleId);
    }

    const db = createAdminClient();
    const { data, error } = await db
      .from("trade_snapshots")
      .select("*")
      .eq("investment_cycle_id", cycleId)
      .order("snapshot_at", { ascending: false });

    if (error) throw new Error(error.message);
    return ((data ?? []) as SnapshotRow[]).map(mapSnapshot);
  },

  async createForCycle(cycleId: string, notes?: string | null): Promise<TradeSnapshot> {
    const { userId } = await requireManagerId();
    const journal = await tradingJournalService.getOrCreateForCycle(cycleId);
    const entries = await tradeEntryService.listByCycle(cycleId);
    const metrics = computeOperationalMetrics(entries);

    const db = createAdminClient();
    const { data, error } = await db
      .from("trade_snapshots")
      .insert({
        journal_id: journal.id,
        investment_cycle_id: cycleId,
        pool_manager_id: journal.poolManagerId,
        open_positions_count: metrics.openPositions,
        closed_positions_count: metrics.closedPositions,
        total_trades: metrics.totalTrades,
        winning_trades: metrics.winningTrades,
        losing_trades: metrics.losingTrades,
        average_holding_hours: metrics.averageHoldingHours,
        current_exposure: metrics.currentExposure,
        metrics: metrics as unknown as Record<string, unknown>,
        notes: notes?.trim() ?? null,
        created_by: userId,
      } as never)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const snapshot = mapSnapshot(data as SnapshotRow);

    await auditService.log({
      actorId: userId,
      action: TRADING_JOURNAL_AUDIT_ACTIONS.SNAPSHOT_CREATED,
      entityType: TRADE_SNAPSHOT_ENTITY_TYPE,
      entityId: snapshot.id,
      newValues: {
        openPositions: metrics.openPositions,
        closedPositions: metrics.closedPositions,
        totalTrades: metrics.totalTrades,
      },
    });

    await cycleProgressService.recordSnapshot(snapshot, userId);

    return snapshot;
  },

  async getLatestForCycle(cycleId: string): Promise<TradeSnapshot | null> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("trade_snapshots")
      .select("*")
      .eq("investment_cycle_id", cycleId)
      .order("snapshot_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return mapSnapshot(data as SnapshotRow);
  },
};
