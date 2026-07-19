import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import type { TradeJournalStatus } from "@/constants/trading-journal";
import {
  TRADING_JOURNAL_ENTITY_TYPE,
  TRADING_JOURNAL_AUDIT_ACTIONS,
  TRADING_JOURNAL_WRITABLE_CYCLE_STATUSES,
  TRADING_JOURNAL_VISIBLE_CYCLE_STATUSES,
} from "@/constants/trading-journal";
import { auditService } from "@/services/audit.service";
import { investmentCycleService } from "@/services/investment-cycle.service";
import type { TradeJournal } from "@/domain/trading-journal/types";

type JournalRow = {
  id: string;
  investment_cycle_id: string;
  pool_manager_id: string;
  strategy_id: string;
  status: TradeJournalStatus;
  created_at: string;
  updated_at: string;
};

function mapJournal(row: JournalRow): TradeJournal {
  return {
    id: row.id,
    investmentCycleId: row.investment_cycle_id,
    poolManagerId: row.pool_manager_id,
    strategyId: row.strategy_id,
    status: row.status,
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

function assertCycleJournalVisible(status: string): void {
  if (!TRADING_JOURNAL_VISIBLE_CYCLE_STATUSES.includes(status as never)) {
    throw new Error("Trading journal is not available for this cycle status.");
  }
}

function assertCycleJournalWritable(status: string): void {
  if (!TRADING_JOURNAL_WRITABLE_CYCLE_STATUSES.includes(status as never)) {
    throw new Error("Trades may only be recorded during trading or distribution phases.");
  }
}

export const tradingJournalService = {
  async getByCycleId(cycleId: string): Promise<TradeJournal | null> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("trade_journals")
      .select("*")
      .eq("investment_cycle_id", cycleId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? mapJournal(data as JournalRow) : null;
  },

  async getOrCreateForCycle(cycleId: string): Promise<TradeJournal> {
    const { userId, managerId } = await requireManagerId();
    const cycle = await investmentCycleService.getByIdForManager(cycleId);
    assertCycleJournalVisible(cycle.status);

    const existing = await this.getByCycleId(cycleId);
    if (existing) return existing;

    const db = createAdminClient();
    const { data, error } = await db
      .from("trade_journals")
      .insert({
        investment_cycle_id: cycleId,
        pool_manager_id: managerId,
        strategy_id: cycle.strategyId,
        status: "active",
      } as never)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const journal = mapJournal(data as JournalRow);

    await auditService.log({
      actorId: userId,
      action: TRADING_JOURNAL_AUDIT_ACTIONS.JOURNAL_CREATED,
      entityType: TRADING_JOURNAL_ENTITY_TYPE,
      entityId: journal.id,
      newValues: { investmentCycleId: cycleId },
    });

    return journal;
  },

  async getForManager(cycleId: string): Promise<TradeJournal | null> {
    await requireManagerId();
    const cycle = await investmentCycleService.getByIdForManager(cycleId);
    assertCycleJournalVisible(cycle.status);
    return this.getByCycleId(cycleId);
  },

  async getForAdmin(cycleId: string): Promise<TradeJournal | null> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    return this.getByCycleId(cycleId);
  },

  async listTradableCyclesForManager(): Promise<
    Array<{ cycleId: string; cycleName: string; cycleStatus: string; journalId: string | null }>
  > {
    const { managerId } = await requireManagerId();
    const db = createAdminClient();

    const { data: cycles, error } = await db
      .from("investment_cycles")
      .select("id, name, status")
      .eq("pool_manager_id", managerId)
      .in("status", [...TRADING_JOURNAL_VISIBLE_CYCLE_STATUSES])
      .order("updated_at", { ascending: false });

    if (error) throw new Error(error.message);

    const cycleRows = (cycles ?? []) as Array<{ id: string; name: string; status: string }>;
    if (cycleRows.length === 0) return [];

    const cycleIds = cycleRows.map((c) => c.id);
    const { data: journals } = await db
      .from("trade_journals")
      .select("id, investment_cycle_id")
      .in("investment_cycle_id", cycleIds);

    const journalByCycle = new Map(
      ((journals ?? []) as Array<{ id: string; investment_cycle_id: string }>).map((j) => [
        j.investment_cycle_id,
        j.id,
      ])
    );

    return cycleRows.map((c) => ({
      cycleId: c.id,
      cycleName: c.name,
      cycleStatus: c.status,
      journalId: journalByCycle.get(c.id) ?? null,
    }));
  },

  assertCycleJournalWritable,
};
