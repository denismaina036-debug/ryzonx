import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import type { InvestmentCycleStatus } from "@/constants/investment-cycle";
import { INVESTMENT_CYCLE_STATUS_LABELS } from "@/constants/investment-cycle";
import type { CycleProgressPhase, CycleProgressEventType } from "@/constants/cycle-progress";
import {
  CYCLE_PROGRESS_PHASE_LABELS,
  CYCLE_PROGRESS_ENTITY_TYPE,
} from "@/constants/cycle-progress";
import { TRADING_JOURNAL_AUDIT_ACTIONS } from "@/constants/trading-journal";
import { auditService } from "@/services/audit.service";
import { investmentCycleService } from "@/services/investment-cycle.service";
import { computeOperationalMetrics } from "@/lib/trading-journal/metrics";
import type {
  CycleProgressEvent,
  CycleProgressSummary,
  InvestorCycleOperationsView,
  TradeEntry,
  TradeSnapshot,
} from "@/domain/trading-journal/types";
import type { InvestmentCycle } from "@/domain/investment/types";
import type { TradeEntryDirection, TradeEntryStatus } from "@/constants/trade-entry";

type EntryRow = {
  id: string;
  journal_id: string;
  investment_cycle_id: string;
  pool_manager_id: string;
  trade_reference: string;
  instrument: string;
  market: string | null;
  direction: TradeEntryDirection;
  entry_price: string | number;
  exit_price: string | number | null;
  quantity: string | number;
  status: TradeEntryStatus;
  notes: string | null;
  opened_at: string | null;
  closed_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function mapEntryRow(row: EntryRow): TradeEntry {
  return {
    id: row.id,
    journalId: row.journal_id,
    investmentCycleId: row.investment_cycle_id,
    poolManagerId: row.pool_manager_id,
    tradeReference: row.trade_reference,
    instrument: row.instrument,
    market: row.market,
    direction: row.direction,
    entryPrice: toNumber(row.entry_price),
    exitPrice: row.exit_price != null ? toNumber(row.exit_price) : null,
    quantity: toNumber(row.quantity),
    status: row.status,
    notes: row.notes,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listEntriesForCycle(cycleId: string): Promise<TradeEntry[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("trade_entries")
    .select("*")
    .eq("investment_cycle_id", cycleId);

  if (error || !data) return [];
  return (data as EntryRow[]).map(mapEntryRow);
}

type EventRow = {
  id: string;
  investment_cycle_id: string;
  phase: CycleProgressPhase;
  event_type: CycleProgressEventType;
  label: string;
  description: string | null;
  metadata: Record<string, unknown>;
  actor_id: string | null;
  occurred_at: string;
  created_at: string;
};

function mapEvent(row: EventRow): CycleProgressEvent {
  return {
    id: row.id,
    investmentCycleId: row.investment_cycle_id,
    phase: row.phase,
    eventType: row.event_type,
    label: row.label,
    description: row.description,
    metadata: row.metadata ?? {},
    actorId: row.actor_id,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  };
}

function resolveCurrentPhase(
  cycle: InvestmentCycle,
  openPositions: number
): CycleProgressPhase {
  switch (cycle.status) {
    case "funding":
    case "approved":
      return "funding";
    case "trading":
      return openPositions > 0 ? "monitoring" : "trading";
    case "distribution":
      return "distribution_pending";
    case "completed":
    case "archived":
      return "completed";
    default:
      return "funding";
  }
}

function buildLifecycleMilestones(cycle: InvestmentCycle): CycleProgressEvent[] {
  const milestones: Array<{ at: string | null; phase: CycleProgressPhase; label: string }> = [
    { at: cycle.fundingStartedAt, phase: "funding", label: "Funding opened" },
    { at: cycle.tradingStartedAt, phase: "trading", label: "Trading started" },
    { at: cycle.distributionStartedAt, phase: "distribution_pending", label: "Distribution phase started" },
    { at: cycle.completedAt, phase: "completed", label: "Cycle completed" },
  ];

  return milestones
    .filter((m) => m.at)
    .map((m, index) => ({
      id: `milestone-${cycle.id}-${index}`,
      investmentCycleId: cycle.id,
      phase: m.phase,
      eventType: "cycle_advanced" as CycleProgressEventType,
      label: m.label,
      description: null,
      metadata: {},
      actorId: null,
      occurredAt: m.at!,
      createdAt: m.at!,
    }));
}

async function insertEvent(input: {
  cycleId: string;
  phase: CycleProgressPhase;
  eventType: CycleProgressEventType;
  label: string;
  description?: string | null;
  metadata?: Record<string, unknown>;
  actorId?: string | null;
}): Promise<CycleProgressEvent> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("cycle_progress_events")
    .insert({
      investment_cycle_id: input.cycleId,
      phase: input.phase,
      event_type: input.eventType,
      label: input.label,
      description: input.description ?? null,
      metadata: input.metadata ?? {},
      actor_id: input.actorId ?? null,
    } as never)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapEvent(data as EventRow);
}

export const cycleProgressService = {
  async listEvents(cycleId: string): Promise<CycleProgressEvent[]> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("cycle_progress_events")
      .select("*")
      .eq("investment_cycle_id", cycleId)
      .order("occurred_at", { ascending: false });

    if (error) throw new Error(error.message);
    return ((data ?? []) as EventRow[]).map(mapEvent);
  },

  async getSummary(cycleId: string): Promise<CycleProgressSummary> {
    const cycle = await investmentCycleService.getById(cycleId);
    if (!cycle) throw new Error("Investment cycle not found.");

    const entries = await listEntriesForCycle(cycleId);
    const metrics = computeOperationalMetrics(entries);
    const storedEvents = await this.listEvents(cycleId);
    const milestones = buildLifecycleMilestones(cycle);

    const timeline = [...milestones, ...storedEvents].sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    );

    const currentPhase = resolveCurrentPhase(cycle, metrics.openPositions);

    return {
      currentPhase,
      tradingStatus: INVESTMENT_CYCLE_STATUS_LABELS[cycle.status as InvestmentCycleStatus],
      timeline,
      metrics,
    };
  },

  async getSummaryForManager(cycleId: string): Promise<CycleProgressSummary> {
    await requireRole(USER_ROLES.POOL_MANAGER);
    return this.getSummary(cycleId);
  },

  async getSummaryForAdmin(cycleId: string): Promise<CycleProgressSummary> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    return this.getSummary(cycleId);
  },

  async recordTradeOpened(entry: TradeEntry, actorId: string): Promise<void> {
    await insertEvent({
      cycleId: entry.investmentCycleId,
      phase: "trading",
      eventType: "trade_opened",
      label: "Trade opened",
      description: `${entry.instrument} (${entry.tradeReference})`,
      metadata: { tradeEntryId: entry.id, tradeReference: entry.tradeReference },
      actorId,
    });
  },

  async recordTradeEdited(entry: TradeEntry, actorId: string): Promise<void> {
    await insertEvent({
      cycleId: entry.investmentCycleId,
      phase: "monitoring",
      eventType: "trade_edited",
      label: "Trade updated",
      description: entry.tradeReference,
      metadata: { tradeEntryId: entry.id },
      actorId,
    });
  },

  async recordTradeClosed(entry: TradeEntry, actorId: string): Promise<void> {
    await insertEvent({
      cycleId: entry.investmentCycleId,
      phase: "monitoring",
      eventType: "trade_closed",
      label: "Trade closed",
      description: `${entry.instrument} (${entry.tradeReference})`,
      metadata: { tradeEntryId: entry.id, tradeReference: entry.tradeReference },
      actorId,
    });
  },

  async recordSnapshot(snapshot: TradeSnapshot, actorId: string): Promise<void> {
    await insertEvent({
      cycleId: snapshot.investmentCycleId,
      phase: "monitoring",
      eventType: "snapshot_created",
      label: "Operational snapshot recorded",
      description: `${snapshot.openPositionsCount} open, ${snapshot.closedPositionsCount} closed`,
      metadata: { snapshotId: snapshot.id },
      actorId,
    });
  },

  async recordOperationalFlag(
    cycleId: string,
    actorId: string,
    reason: string
  ): Promise<CycleProgressEvent> {
    await requireRole(USER_ROLES.ADMINISTRATOR);

    const summary = await this.getSummary(cycleId);

    await auditService.log({
      actorId,
      action: TRADING_JOURNAL_AUDIT_ACTIONS.OPERATIONAL_FLAG,
      entityType: CYCLE_PROGRESS_ENTITY_TYPE,
      entityId: cycleId,
      newValues: { reason },
    });

    return insertEvent({
      cycleId,
      phase: summary.currentPhase,
      eventType: "operational_flag",
      label: "Operational issue flagged",
      description: reason,
      metadata: { reason },
      actorId,
    });
  },

  async recordAdminReview(cycleId: string, actorId: string, note?: string): Promise<CycleProgressEvent> {
    await requireRole(USER_ROLES.ADMINISTRATOR);

    await auditService.log({
      actorId,
      action: TRADING_JOURNAL_AUDIT_ACTIONS.ADMIN_REVIEW,
      entityType: CYCLE_PROGRESS_ENTITY_TYPE,
      entityId: cycleId,
      newValues: { note: note ?? null },
    });

    const summary = await this.getSummary(cycleId);
    return insertEvent({
      cycleId,
      phase: summary.currentPhase,
      eventType: "admin_review",
      label: "Administrator review recorded",
      description: note ?? null,
      metadata: { note: note ?? null },
      actorId,
    });
  },

  async getInvestorViewBySlug(slug: string): Promise<InvestorCycleOperationsView | null> {
    const cycle = await investmentCycleService.getPublicBySlug(slug);
    if (!cycle) return null;
    if (!["trading", "distribution", "completed", "archived"].includes(cycle.status)) {
      return {
        tradingStatus: INVESTMENT_CYCLE_STATUS_LABELS[cycle.status],
        currentPhase: cycle.status === "funding" ? "funding" : "funding",
        phaseLabel: CYCLE_PROGRESS_PHASE_LABELS.funding,
        timeline: buildLifecycleMilestones(cycle).map((e) => ({
          label: e.label,
          occurredAt: e.occurredAt,
          description: e.description,
        })),
        journalSummary: {
          openPositionsCount: 0,
          closedPositionsCount: 0,
          totalTrades: 0,
          lastSnapshotAt: null,
        },
        portfolioProgress: {
          raisedCapital: cycle.raisedCapital,
          targetCapital: cycle.targetCapital,
          remainingCapital: cycle.remainingCapital ?? null,
          fundingProgressPct: cycle.fundingProgressPct ?? null,
          investorCount: cycle.investorCount,
          cycleStatus: cycle.status,
          fundingStartedAt: cycle.fundingStartedAt ?? cycle.openingDate,
        },
      };
    }

    const entries = await listEntriesForCycle(cycle.id);
    const metrics = computeOperationalMetrics(entries);
    const storedEvents = await this.listEvents(cycle.id);
    const milestones = buildLifecycleMilestones(cycle);
    const timeline = [...milestones, ...storedEvents]
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, 12)
      .map((e) => ({
        label: e.label,
        occurredAt: e.occurredAt,
        description: e.description,
      }));

    const currentPhase = resolveCurrentPhase(cycle, metrics.openPositions);

    const db = createAdminClient();
    const { data: latestSnapshot } = await db
      .from("trade_snapshots")
      .select("snapshot_at")
      .eq("investment_cycle_id", cycle.id)
      .order("snapshot_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      tradingStatus: INVESTMENT_CYCLE_STATUS_LABELS[cycle.status],
      currentPhase,
      phaseLabel: CYCLE_PROGRESS_PHASE_LABELS[currentPhase],
      timeline,
      journalSummary: {
        openPositionsCount: metrics.openPositions,
        closedPositionsCount: metrics.closedPositions,
        totalTrades: metrics.totalTrades,
        lastSnapshotAt: (latestSnapshot as { snapshot_at?: string } | null)?.snapshot_at ?? null,
      },
      portfolioProgress: {
        raisedCapital: cycle.raisedCapital,
        targetCapital: cycle.targetCapital,
        remainingCapital: cycle.remainingCapital ?? null,
        fundingProgressPct: cycle.fundingProgressPct ?? null,
        investorCount: cycle.investorCount,
        cycleStatus: cycle.status,
        fundingStartedAt: cycle.fundingStartedAt ?? cycle.openingDate,
      },
    };
  },
};
