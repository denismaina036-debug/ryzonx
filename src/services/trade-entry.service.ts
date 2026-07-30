import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import type { TradeEntryDirection, TradeEntryResult, TradeEntryStatus } from "@/constants/trade-entry";
import {
  TRADE_ENTRY_ENTITY_TYPE,
  TRADING_JOURNAL_AUDIT_ACTIONS,
} from "@/constants/trading-journal";
import { auditService } from "@/services/audit.service";
import { tradingJournalService } from "@/services/trading-journal.service";
import { investmentCycleService } from "@/services/investment-cycle.service";
import { cycleProgressService } from "@/services/cycle-progress.service";
import { publishPlatformEvent, PLATFORM_EVENT_TYPES } from "@/lib/platform-events/publish";
import { resolveCycleManagerUserId } from "@/lib/platform-events/resolve-recipients";
import { generateTradeReference } from "@/lib/investment/utils";
import { computeTradeRealizedPnl } from "@/lib/financial/profit-distribution-calculator";
import { tradeLossAllocationService } from "@/services/trade-loss-allocation.service";
import { tradeProfitAllocationService } from "@/services/trade-profit-allocation.service";
import type {
  CloseTradeEntryInput,
  CreateTradeEntryInput,
  PublicTradeEntryView,
  TradeEntry,
  UpdateTradeEntryInput,
} from "@/domain/trading-journal/types";

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
  trade_result: string | null;
  realized_pnl: string | number | null;
  loss_applied_at: string | null;
  profit_applied_at: string | null;
  screenshot_url: string | null;
  investor_visible: boolean | null;
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

function mapEntry(row: EntryRow): TradeEntry {
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
    tradeResult: (row.trade_result as TradeEntryResult | null) ?? null,
    realizedPnl: row.realized_pnl != null ? toNumber(row.realized_pnl) : null,
    lossAppliedAt: row.loss_applied_at,
    profitAppliedAt: row.profit_applied_at,
    screenshotUrl: row.screenshot_url ?? null,
    investorVisible: row.investor_visible ?? true,
    notes: row.notes,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

async function getEntryForManager(entryId: string): Promise<TradeEntry> {
  const { managerId } = await requireManagerId();
  const db = createAdminClient();
  const { data, error } = await db.from("trade_entries").select("*").eq("id", entryId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Trade entry not found.");
  const entry = mapEntry(data as EntryRow);
  if (entry.poolManagerId !== managerId) throw new Error("Insufficient permissions");
  return entry;
}

async function assertWritableCycle(cycleId: string): Promise<void> {
  const cycle = await investmentCycleService.getByIdForManager(cycleId);
  tradingJournalService.assertCycleJournalWritable(cycle.status);
}

export const tradeEntryService = {
  async listByCycle(cycleId: string, actor: "manager" | "admin" = "manager"): Promise<TradeEntry[]> {
    if (actor === "admin") {
      await requireRole(USER_ROLES.ADMINISTRATOR);
    } else {
      await requireManagerId();
      await tradingJournalService.getForManager(cycleId);
    }

    const db = createAdminClient();
    const { data, error } = await db
      .from("trade_entries")
      .select("*")
      .eq("investment_cycle_id", cycleId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return ((data ?? []) as EntryRow[]).map(mapEntry);
  },

  async listOpenByCycle(cycleId: string): Promise<TradeEntry[]> {
    const entries = await this.listByCycle(cycleId);
    return entries.filter((e) => e.status === "open" || e.status === "partially_closed");
  },

  /** Sum closed-trade realized P/L for a marketplace-listed cycle. */
  async sumRealizedProfitForCyclePublic(cycleId: string): Promise<number> {
    const db = createAdminClient();
    const { data: cycleRow } = await db
      .from("investment_cycles")
      .select("fund_id")
      .eq("id", cycleId)
      .maybeSingle();
    const cycle = cycleRow as { fund_id: string | null } | null;
    if (!cycle?.fund_id) return 0;

    const { data: fundRow } = await db
      .from("funds")
      .select("is_marketplace_listed, lifecycle_status")
      .eq("id", cycle.fund_id)
      .maybeSingle();
    const fund = fundRow as { is_marketplace_listed?: boolean; lifecycle_status?: string } | null;
    if (!fund?.is_marketplace_listed || fund.lifecycle_status !== "live") return 0;

    const { data, error } = await db
      .from("trade_entries")
      .select("realized_pnl, status")
      .eq("investment_cycle_id", cycleId)
      .eq("status", "closed");

    if (error) throw new Error(error.message);

    return ((data ?? []) as Array<{ realized_pnl: string | number | null; status: string }>).reduce(
      (sum, row) => sum + toNumber(row.realized_pnl),
      0
    );
  },

  /** Public open trades for marketplace display during trading status. */
  async listOpenTradesPublic(
    cycleId: string
  ): Promise<Array<{ instrument: string; direction: string }>> {
    const db = createAdminClient();
    const { data: cycleRow } = await db
      .from("investment_cycles")
      .select("status, fund_id")
      .eq("id", cycleId)
      .maybeSingle();
    const cycle = cycleRow as { status: string; fund_id: string | null } | null;
    if (!cycle || cycle.status !== "trading" || !cycle.fund_id) return [];

    const { data: fundRow } = await db
      .from("funds")
      .select("is_marketplace_listed, lifecycle_status")
      .eq("id", cycle.fund_id)
      .maybeSingle();
    const fund = fundRow as { is_marketplace_listed?: boolean; lifecycle_status?: string } | null;
    if (!fund?.is_marketplace_listed || fund.lifecycle_status !== "live") return [];

    const { data, error } = await db
      .from("trade_entries")
      .select("instrument, direction, status")
      .eq("investment_cycle_id", cycleId)
      .in("status", ["open", "partially_closed"])
      .order("opened_at", { ascending: false });

    if (error) throw new Error(error.message);
    return ((data ?? []) as Array<{ instrument: string; direction: string }>).map((row) => ({
      instrument: row.instrument,
      direction: row.direction,
    }));
  },

  async listClosedByCycle(cycleId: string): Promise<TradeEntry[]> {
    const entries = await this.listByCycle(cycleId);
    return entries.filter((e) => e.status === "closed");
  },

  /** Closed trades visible to investors (marketplace / cycle pages). */
  async listPublicClosedByCycle(cycleId: string): Promise<PublicTradeEntryView[]> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("trade_entries")
      .select("*")
      .eq("investment_cycle_id", cycleId)
      .eq("status", "closed")
      .eq("investor_visible", true)
      .not("closed_at", "is", null)
      .order("closed_at", { ascending: false });

    if (error) throw new Error(error.message);

    return ((data ?? []) as EntryRow[]).map(mapEntry).map((entry) => ({
      id: entry.id,
      tradeReference: entry.tradeReference,
      instrument: entry.instrument,
      direction: entry.direction,
      entryPrice: entry.entryPrice,
      exitPrice: entry.exitPrice,
      quantity: entry.quantity,
      tradeResult: entry.tradeResult,
      realizedPnl: entry.realizedPnl,
      screenshotUrl: entry.screenshotUrl,
      closedAt: entry.closedAt,
    }));
  },

  /** Backfill balance impact for closed trades that were recorded before distribution ran. */
  async reconcileUnappliedTradeBalances(cycleId: string, actorId: string): Promise<number> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("trade_entries")
      .select("*")
      .eq("investment_cycle_id", cycleId)
      .eq("status", "closed");

    if (error) throw new Error(error.message);

    let repaired = 0;
    for (const row of (data ?? []) as EntryRow[]) {
      const entry = mapEntry(row);
      const pnl = entry.realizedPnl ?? 0;

      if (entry.tradeResult === "profit" && pnl > 0 && !entry.profitAppliedAt) {
        await tradeProfitAllocationService.applyProfitToCycle({
          tradeEntry: entry,
          profitAmount: pnl,
          actorId,
        });
        repaired += 1;
      } else if (entry.tradeResult === "loss" && pnl < 0 && !entry.lossAppliedAt) {
        await tradeLossAllocationService.applyLossToCycle({
          tradeEntry: entry,
          lossAmount: Math.abs(pnl),
          actorId,
        });
        repaired += 1;
      }
    }

    return repaired;
  },

  /** One-step: create, open, and close a trade with optional screenshot. */
  async recordCompletedTrade(
    cycleId: string,
    input: CreateTradeEntryInput
  ): Promise<TradeEntry> {
    if (input.amountUsd != null && input.tradeResult) {
      const amount = Math.abs(input.amountUsd);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Dollar amount must be positive.");
      }
      if (input.tradeResult !== "profit" && input.tradeResult !== "loss") {
        throw new Error("Select Win or Loss.");
      }

      const signedPnl = input.tradeResult === "loss" ? -amount : amount;
      const draft = await this.createDraft(cycleId, {
        instrument: input.instrument,
        direction: input.direction ?? "long",
        entryPrice: 1,
        quantity: 1,
        notes: input.notes,
        market: input.market,
      });
      const opened = await this.openTrade(draft.id);
      return this.closeTrade(opened.id, {
        exitPrice: 1,
        tradeResult: input.tradeResult,
        realizedPnlUsd: signedPnl,
        notes: input.notes,
        screenshotUrl: input.screenshotUrl,
      });
    }

    if (input.exitPrice == null || input.exitPrice <= 0) {
      throw new Error("Exit price is required to record a completed trade.");
    }
    if (input.entryPrice == null || input.entryPrice <= 0) {
      throw new Error("Entry price must be positive.");
    }
    if (input.quantity == null || input.quantity <= 0) {
      throw new Error("Quantity must be positive.");
    }

    const draft = await this.createDraft(cycleId, input);
    const opened = await this.openTrade(draft.id);
    return this.closeTrade(opened.id, {
      exitPrice: input.exitPrice,
      tradeResult: input.tradeResult,
      notes: input.notes,
      screenshotUrl: input.screenshotUrl,
    });
  },

  async createDraft(cycleId: string, input: CreateTradeEntryInput): Promise<TradeEntry> {
    const { userId } = await requireManagerId();
    await assertWritableCycle(cycleId);
    const journal = await tradingJournalService.getOrCreateForCycle(cycleId);

    if (!input.instrument?.trim()) throw new Error("Instrument is required.");
    const entryPrice = input.entryPrice ?? 1;
    const quantity = input.quantity ?? 1;
    if (entryPrice <= 0) throw new Error("Entry price must be positive.");
    if (quantity <= 0) throw new Error("Quantity must be positive.");

    const db = createAdminClient();
    const { data, error } = await db
      .from("trade_entries")
      .insert({
        journal_id: journal.id,
        investment_cycle_id: cycleId,
        pool_manager_id: journal.poolManagerId,
        trade_reference: generateTradeReference(),
        instrument: input.instrument.trim(),
        market: input.market?.trim() ?? null,
        direction: input.direction ?? "long",
        entry_price: entryPrice,
        quantity,
        status: "draft",
        notes: input.notes?.trim() ?? null,
        created_by: userId,
        updated_by: userId,
      } as never)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return mapEntry(data as EntryRow);
  },

  async updateDraft(entryId: string, input: UpdateTradeEntryInput): Promise<TradeEntry> {
    const { userId } = await requireManagerId();
    const existing = await getEntryForManager(entryId);
    if (existing.status !== "draft") {
      throw new Error("Only draft entries can be edited.");
    }
    await assertWritableCycle(existing.investmentCycleId);

    const patch: Record<string, unknown> = { updated_by: userId };
    if (input.instrument !== undefined) patch.instrument = input.instrument.trim();
    if (input.market !== undefined) patch.market = input.market?.trim() ?? null;
    if (input.direction !== undefined) patch.direction = input.direction;
    if (input.entryPrice !== undefined) patch.entry_price = input.entryPrice;
    if (input.quantity !== undefined) patch.quantity = input.quantity;
    if (input.notes !== undefined) patch.notes = input.notes?.trim() ?? null;

    const db = createAdminClient();
    const { data, error } = await db
      .from("trade_entries")
      .update(patch as never)
      .eq("id", entryId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const entry = mapEntry(data as EntryRow);

    await auditService.log({
      actorId: userId,
      action: TRADING_JOURNAL_AUDIT_ACTIONS.TRADE_EDITED,
      entityType: TRADE_ENTRY_ENTITY_TYPE,
      entityId: entry.id,
      oldValues: { status: existing.status, instrument: existing.instrument },
      newValues: patch,
    });

    await cycleProgressService.recordTradeEdited(entry, userId);

    return entry;
  },

  async openTrade(entryId: string): Promise<TradeEntry> {
    const { userId } = await requireManagerId();
    const existing = await getEntryForManager(entryId);
    if (existing.status !== "draft") {
      throw new Error("Only draft entries can be opened.");
    }
    await assertWritableCycle(existing.investmentCycleId);

    const now = new Date().toISOString();
    const db = createAdminClient();
    const { data, error } = await db
      .from("trade_entries")
      .update({
        status: "open",
        opened_at: now,
        updated_by: userId,
      } as never)
      .eq("id", entryId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const entry = mapEntry(data as EntryRow);

    await auditService.log({
      actorId: userId,
      action: TRADING_JOURNAL_AUDIT_ACTIONS.TRADE_OPENED,
      entityType: TRADE_ENTRY_ENTITY_TYPE,
      entityId: entry.id,
      newValues: { tradeReference: entry.tradeReference, instrument: entry.instrument },
    });

    await cycleProgressService.recordTradeOpened(entry, userId);

    const poolManagerUserId = await resolveCycleManagerUserId(entry.investmentCycleId);
    publishPlatformEvent({
      eventType: PLATFORM_EVENT_TYPES.TRADE_OPENED,
      category: "operations",
      entityType: "trade_entry",
      entityId: entry.id,
      actorId: userId,
      payload: {
        poolManagerUserId,
        cycleId: entry.investmentCycleId,
        tradeReference: entry.tradeReference,
        instrument: entry.instrument,
        summary: `Trade ${entry.tradeReference} opened`,
      },
    });

    return entry;
  },

  async updateOpenTrade(entryId: string, input: UpdateTradeEntryInput): Promise<TradeEntry> {
    const { userId } = await requireManagerId();
    const existing = await getEntryForManager(entryId);
    if (existing.status !== "open" && existing.status !== "partially_closed") {
      throw new Error("Only open trades can be updated.");
    }
    await assertWritableCycle(existing.investmentCycleId);

    const patch: Record<string, unknown> = { updated_by: userId };
    if (input.notes !== undefined) patch.notes = input.notes?.trim() ?? null;
    if (input.entryPrice !== undefined) patch.entry_price = input.entryPrice;
    if (input.quantity !== undefined) patch.quantity = input.quantity;

    const db = createAdminClient();
    const { data, error } = await db
      .from("trade_entries")
      .update(patch as never)
      .eq("id", entryId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const entry = mapEntry(data as EntryRow);

    await auditService.log({
      actorId: userId,
      action: TRADING_JOURNAL_AUDIT_ACTIONS.TRADE_EDITED,
      entityType: TRADE_ENTRY_ENTITY_TYPE,
      entityId: entry.id,
      oldValues: { entryPrice: existing.entryPrice, quantity: existing.quantity },
      newValues: patch,
    });

    await cycleProgressService.recordTradeEdited(entry, userId);

    return entry;
  },

  async closeTrade(entryId: string, input: CloseTradeEntryInput): Promise<TradeEntry> {
    const { userId } = await requireManagerId();
    const existing = await getEntryForManager(entryId);
    if (existing.status !== "open" && existing.status !== "partially_closed") {
      throw new Error("Only open trades can be closed.");
    }
    if (input.realizedPnlUsd == null && input.exitPrice <= 0) {
      throw new Error("Exit price must be positive.");
    }
    await assertWritableCycle(existing.investmentCycleId);

    const draftEntry = { ...existing, exitPrice: input.exitPrice, status: "closed" as const };
    const realizedPnl =
      input.realizedPnlUsd != null
        ? input.realizedPnlUsd
        : computeTradeRealizedPnl(draftEntry);
    const tradeResult = tradeLossAllocationService.resolveTradeResult(
      realizedPnl,
      input.tradeResult
    );

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = {
      status: "closed",
      exit_price: input.exitPrice,
      closed_at: now,
      trade_result: tradeResult,
      realized_pnl: realizedPnl,
      updated_by: userId,
    };
    if (input.notes !== undefined) patch.notes = input.notes?.trim() ?? null;
    if (input.screenshotUrl !== undefined) {
      patch.screenshot_url = input.screenshotUrl?.trim() || null;
    }

    const db = createAdminClient();
    const { data, error } = await db
      .from("trade_entries")
      .update(patch as never)
      .eq("id", entryId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const entry = mapEntry(data as EntryRow);

    await auditService.log({
      actorId: userId,
      action: TRADING_JOURNAL_AUDIT_ACTIONS.TRADE_CLOSED,
      entityType: TRADE_ENTRY_ENTITY_TYPE,
      entityId: entry.id,
      newValues: {
        exitPrice: input.exitPrice,
        tradeReference: entry.tradeReference,
        tradeResult,
        realizedPnl,
      },
    });

    if (tradeResult === "loss" && realizedPnl < 0) {
      await tradeLossAllocationService.applyLossToCycle({
        tradeEntry: entry,
        lossAmount: Math.abs(realizedPnl),
        actorId: userId,
      });
    }

    if (tradeResult === "profit" && realizedPnl > 0) {
      await tradeProfitAllocationService.applyProfitToCycle({
        tradeEntry: entry,
        profitAmount: realizedPnl,
        actorId: userId,
      });
    }

    await cycleProgressService.recordTradeClosed(entry, userId);

    const poolManagerUserId = await resolveCycleManagerUserId(entry.investmentCycleId);
    publishPlatformEvent({
      eventType: PLATFORM_EVENT_TYPES.TRADE_CLOSED,
      category: "operations",
      entityType: "trade_entry",
      entityId: entry.id,
      actorId: userId,
      payload: {
        poolManagerUserId,
        cycleId: entry.investmentCycleId,
        tradeReference: entry.tradeReference,
        instrument: entry.instrument,
        exitPrice: input.exitPrice,
        summary: `Trade ${entry.tradeReference} closed`,
      },
    });

    return entry;
  },
};
