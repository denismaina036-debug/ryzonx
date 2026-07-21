import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import type { InvestmentCycleStatus } from "@/constants/investment-cycle";
import { INVESTMENT_CYCLE_ALLOCATABLE_STATUSES } from "@/constants/investment-cycle";
import { auditService } from "@/services/audit.service";
import { strategyService } from "@/services/strategy.service";
import { tradeEntryService } from "@/services/trade-entry.service";
import {
  assertInvestmentCycleTransition,
  isInvestmentCycleEditable,
  isCycleAtOrAfter,
} from "@/lib/investment/cycle-lifecycle";
import { generateInvestmentSlug } from "@/lib/investment/utils";
import { adminNotesService } from "@/services/admin-notes.service";
import { publishPlatformEvent, PLATFORM_EVENT_TYPES } from "@/lib/platform-events/publish";
import { resolvePoolManagerUserId } from "@/lib/platform-events/resolve-recipients";
import type {
  CreateInvestmentCycleInput,
  CreatePoolInvestmentCycleInput,
  InvestmentCycle,
  UpdateInvestmentCycleInput,
} from "@/domain/investment/types";
import {
  buildPoolConfigSnapshot,
  type PoolConfigSnapshot,
} from "@/domain/pools/pool-config-snapshot";
import {
  friendlyInvestmentCycleError,
  sanitizeCycleCapacityFields,
  validateCycleCapacityFields,
} from "@/domain/investment/cycle-validation";

type CycleRow = {
  id: string;
  strategy_id: string;
  pool_manager_id: string;
  fund_id: string | null;
  cycle_number: number;
  pool_version: number;
  pool_config_snapshot: PoolConfigSnapshot | Record<string, unknown> | null;
  name: string;
  slug: string;
  description: string | null;
  status: InvestmentCycleStatus;
  target_capital: number | null;
  min_investment: number | null;
  max_capacity: number | null;
  raised_capital: number;
  investor_count: number;
  opening_date: string | null;
  closing_date: string | null;
  funding_deadline: string | null;
  duration_days: number | null;
  submitted_at: string | null;
  approved_at: string | null;
  funding_started_at: string | null;
  trading_started_at: string | null;
  distribution_started_at: string | null;
  completed_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

function parseSnapshot(raw: CycleRow["pool_config_snapshot"]): PoolConfigSnapshot | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  if ("version" in raw && "pool" in raw) return raw as PoolConfigSnapshot;
  return null;
}

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function mapCycle(row: CycleRow): InvestmentCycle {
  return {
    id: row.id,
    strategyId: row.strategy_id,
    poolManagerId: row.pool_manager_id,
    fundId: row.fund_id,
    cycleNumber: row.cycle_number ?? 1,
    poolVersion: row.pool_version ?? 1,
    poolConfigSnapshot: parseSnapshot(row.pool_config_snapshot),
    name: row.name,
    slug: row.slug,
    description: row.description,
    status: row.status,
    targetCapital: row.target_capital != null ? toNumber(row.target_capital) : null,
    minInvestment: row.min_investment != null ? toNumber(row.min_investment) : null,
    maxCapacity: row.max_capacity != null ? toNumber(row.max_capacity) : null,
    raisedCapital: toNumber(row.raised_capital),
    investorCount: row.investor_count,
    openingDate: row.opening_date,
    closingDate: row.closing_date ?? row.funding_deadline,
    fundingDeadline: row.funding_deadline ?? row.closing_date,
    durationDays: row.duration_days,
    submittedAt: row.submitted_at,
    approvedAt: row.approved_at,
    fundingStartedAt: row.funding_started_at,
    tradingStartedAt: row.trading_started_at,
    distributionStartedAt: row.distribution_started_at,
    completedAt: row.completed_at,
    archivedAt: row.archived_at,
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

function statusTimestampPatch(
  status: InvestmentCycleStatus,
  now: string
): Partial<CycleRow> {
  switch (status) {
    case "submitted":
      return { submitted_at: now };
    case "approved":
      return { approved_at: now };
    case "funding":
      return { funding_started_at: now };
    case "trading":
      return { trading_started_at: now };
    case "distribution":
      return { distribution_started_at: now };
    case "completed":
      return { completed_at: now };
    case "archived":
      return { archived_at: now };
    default:
      return {};
  }
}

const STRATEGY_STATUSES_FOR_CYCLES = new Set([
  "approved",
  "available",
  "operating",
  "paused",
]);

function readManagedConfigFromFund(fund: Record<string, unknown>) {
  const poolFaq = fund.pool_faq;
  if (!poolFaq || typeof poolFaq !== "object" || Array.isArray(poolFaq)) return {};
  return ((poolFaq as { managedPool?: Record<string, unknown> }).managedPool ?? {}) as {
    fundingPeriodDays?: number;
    openingDate?: string;
    closingDate?: string;
    scheduleOpenEnded?: boolean;
  };
}

function computeFundingDeadline(
  fund: Record<string, unknown>,
  closingDate: string | null
): string | null {
  if (closingDate) return closingDate;
  const managed = readManagedConfigFromFund(fund);
  if (managed.scheduleOpenEnded) return null;
  if (managed.closingDate) return new Date(managed.closingDate).toISOString();
  const days = managed.fundingPeriodDays;
  if (days != null && days > 0) {
    const end = new Date();
    end.setDate(end.getDate() + days);
    return end.toISOString();
  }
  return null;
}

function readStrategyIdFromFund(fund: Record<string, unknown>): string | null {
  const poolFaq = fund.pool_faq;
  const managedPool =
    poolFaq && typeof poolFaq === "object" && !Array.isArray(poolFaq)
      ? ((poolFaq as { managedPool?: { strategyId?: string; internalStrategyId?: string } })
          .managedPool ?? {})
      : {};
  return managedPool.strategyId ?? managedPool.internalStrategyId ?? null;
}

async function insertCycleFromPoolFund(
  fund: Record<string, unknown>,
  fundId: string,
  managerId: string,
  input: CreatePoolInvestmentCycleInput,
  actorUserId: string | null
): Promise<InvestmentCycle> {
  const db = createAdminClient();
  const strategyId = readStrategyIdFromFund(fund);
  if (!strategyId) {
    throw new Error("Pool must have an approved strategy before creating investment cycles.");
  }

  const strategy = await strategyService.getById(strategyId);
  if (!strategy) throw new Error("Strategy not found.");
  if (!STRATEGY_STATUSES_FOR_CYCLES.has(strategy.status)) {
    throw new Error("Strategy must be approved before creating investment cycles.");
  }

  const { data: existingCycles } = await db
    .from("investment_cycles")
    .select("cycle_number, status")
    .eq("fund_id", fundId)
    .order("cycle_number", { ascending: false })
    .limit(1);

  const lastCycle = (existingCycles ?? [])[0] as
    | { cycle_number: number; status: InvestmentCycleStatus }
    | undefined;

  if (lastCycle) {
    const canCreate = ["completed", "archived"].includes(lastCycle.status);
    const atCapacity =
      lastCycle.status === "funding" || lastCycle.status === "trading";
    if (!canCreate && !atCapacity) {
      throw new Error(
        "A new cycle can only be created when the current cycle is completed or at capacity."
      );
    }
    if (atCapacity) {
      const { data: fullLast } = await db
        .from("investment_cycles")
        .select("raised_capital, max_capacity, status")
        .eq("fund_id", fundId)
        .eq("cycle_number", lastCycle.cycle_number)
        .maybeSingle();
      const row = fullLast as {
        raised_capital: number;
        max_capacity: number | null;
        status: InvestmentCycleStatus;
      } | null;
      const full =
        row?.max_capacity != null &&
        toNumber(row.raised_capital) >= toNumber(row.max_capacity);
      if (!full && !canCreate) {
        throw new Error(
          "The current investment cycle must be completed or full before opening a new one."
        );
      }
    }
  }

  const cycleNumber = (lastCycle?.cycle_number ?? 0) + 1;
  const poolVersion = (fund.pool_config_version as number | undefined) ?? 1;
  const snapshot = buildPoolConfigSnapshot(fund, strategyId, poolVersion);

  const poolName = (fund.name as string) ?? "Pool";
  const cycleName = input.name?.trim() || `${poolName} — Cycle ${cycleNumber}`;
  const slug = `${(fund.slug as string) ?? "pool"}-cycle-${cycleNumber}`;

  const capacity = sanitizeCycleCapacityFields({
    targetCapital:
      fund.target_capital != null ? toNumber(fund.target_capital as number) : null,
    minInvestment:
      fund.min_investment != null ? toNumber(fund.min_investment as number) : null,
    maxCapacity:
      fund.max_aum != null
        ? toNumber(fund.max_aum as number)
        : fund.target_capital != null
          ? toNumber(fund.target_capital as number)
          : null,
    durationDays:
      fund.pool_duration_days != null ? toNumber(fund.pool_duration_days as number) : null,
  });

  const openingDate = input.openingDate
    ? new Date(input.openingDate).toISOString()
    : null;
  const closingDate = input.closingDate
    ? new Date(input.closingDate).toISOString()
    : null;
  const fundingDeadline = computeFundingDeadline(fund, closingDate);

  const { data, error } = await db
    .from("investment_cycles")
    .insert({
      strategy_id: strategyId,
      pool_manager_id: managerId,
      fund_id: fundId,
      cycle_number: cycleNumber,
      pool_version: poolVersion,
      pool_config_snapshot: snapshot,
      slug,
      name: cycleName,
      description: (fund.description as string | null) ?? null,
      target_capital: capacity.targetCapital,
      min_investment: capacity.minInvestment,
      max_capacity: capacity.maxCapacity,
      duration_days: capacity.durationDays,
      opening_date: openingDate,
      closing_date: closingDate,
      funding_deadline: fundingDeadline,
      status: "draft",
    } as never)
    .select("*")
    .single();

  if (error) throw new Error(friendlyInvestmentCycleError(error.message));
  const cycle = mapCycle(data as CycleRow);

  if (actorUserId) {
    await auditService.log({
      actorId: actorUserId,
      action: "investment_cycle_created_from_pool",
      entityType: "investment_cycle",
      entityId: cycle.id,
      newValues: { fundId, cycleNumber, poolVersion },
    });
  }

  return cycle;
}

export const investmentCycleService = {
  async listMine(): Promise<InvestmentCycle[]> {
    const { managerId } = await requireManagerId();
    const db = createAdminClient();
    const { data, error } = await db
      .from("investment_cycles")
      .select("*")
      .eq("pool_manager_id", managerId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return ((data ?? []) as CycleRow[]).map(mapCycle);
  },

  async listByStrategy(strategyId: string): Promise<InvestmentCycle[]> {
    const { managerId } = await requireManagerId();
    const strategy = await strategyService.getById(strategyId);
    if (!strategy || strategy.poolManagerId !== managerId) {
      throw new Error("Strategy not found.");
    }

    const db = createAdminClient();
    const { data, error } = await db
      .from("investment_cycles")
      .select("*")
      .eq("strategy_id", strategyId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return ((data ?? []) as CycleRow[]).map(mapCycle);
  },

  async listByFund(fundId: string): Promise<InvestmentCycle[]> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("investment_cycles")
      .select("*")
      .eq("fund_id", fundId)
      .order("cycle_number", { ascending: true });

    if (error) throw new Error(error.message);
    return ((data ?? []) as CycleRow[]).map(mapCycle);
  },

  async listByFundForManager(fundId: string): Promise<InvestmentCycle[]> {
    const { managerId } = await requireManagerId();
    const db = createAdminClient();
    const { data: fund } = await db
      .from("funds")
      .select("pool_manager_id")
      .eq("id", fundId)
      .maybeSingle();
    if (!fund || (fund as { pool_manager_id: string }).pool_manager_id !== managerId) {
      throw new Error("Pool not found.");
    }
    return this.listByFund(fundId);
  },

  /** Current cycle for marketplace display — funding, trading, or distribution. */
  async getActiveForFund(fundId: string): Promise<InvestmentCycle | null> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("investment_cycles")
      .select("*")
      .eq("fund_id", fundId)
      .in("status", ["funding", "trading", "distribution", "approved"])
      .order("cycle_number", { ascending: false });

    if (error) throw new Error(error.message);
    const rows = (data ?? []) as CycleRow[];
    const priority: InvestmentCycleStatus[] = [
      "funding",
      "trading",
      "distribution",
      "approved",
    ];
    for (const status of priority) {
      const match = rows.find((r) => r.status === status);
      if (match) return mapCycle(match);
    }
    return null;
  },

  /** First investment cycle for a draft pool — stays in draft until go-live. */
  async createDraftCycleForPool(
    fundId: string,
    actorUserId: string
  ): Promise<InvestmentCycle> {
    const existing = await this.listByFund(fundId);
    if (existing.length > 0) return existing[0]!;

    const db = createAdminClient();
    const { data: fundRow, error: fundError } = await db
      .from("funds")
      .select("*")
      .eq("id", fundId)
      .single();
    if (fundError || !fundRow) throw new Error("Pool not found.");
    const fund = fundRow as Record<string, unknown>;
    const managerId = fund.pool_manager_id as string;
    if (!managerId) throw new Error("Pool has no assigned manager.");

    const managed = readManagedConfigFromFund(fund);
    const openingDate = managed.openingDate
      ? new Date(managed.openingDate).toISOString()
      : undefined;
    const closingDate = managed.scheduleOpenEnded
      ? undefined
      : managed.closingDate
        ? new Date(managed.closingDate).toISOString()
        : undefined;

    return insertCycleFromPoolFund(
      fund,
      fundId,
      managerId,
      { fundId, openingDate, closingDate },
      actorUserId
    );
  },

  async createFromPool(input: CreatePoolInvestmentCycleInput): Promise<InvestmentCycle> {
    const { userId, managerId } = await requireManagerId();
    const db = createAdminClient();

    const { data: fundRow, error: fundError } = await db
      .from("funds")
      .select("*")
      .eq("id", input.fundId)
      .single();

    if (fundError || !fundRow) throw new Error("Pool not found.");
    const fund = fundRow as Record<string, unknown>;
    if ((fund.pool_manager_id as string) !== managerId) {
      throw new Error("Insufficient permissions");
    }

    return insertCycleFromPoolFund(fund, input.fundId, managerId, input, userId);
  },

  async createFirstCycleForApprovedPool(
    fundId: string,
    actorUserId: string,
    options?: { name?: string; openingDate?: string; closingDate?: string }
  ): Promise<InvestmentCycle> {
    const existing = await this.listByFund(fundId);
    if (existing.length > 0) {
      const cycle = existing[0]!;
      if (cycle.status === "draft" || cycle.status === "submitted" || cycle.status === "approved") {
        return this.adminActivateCycleForPoolGoLive(cycle.id);
      }
      return cycle;
    }

    const db = createAdminClient();
    const { data: fundRow, error: fundError } = await db
      .from("funds")
      .select("*")
      .eq("id", fundId)
      .single();
    if (fundError || !fundRow) throw new Error("Pool not found.");
    const fund = fundRow as Record<string, unknown>;
    const managerId = fund.pool_manager_id as string;
    if (!managerId) throw new Error("Pool has no assigned manager.");

    const cycle = await insertCycleFromPoolFund(
      fund,
      fundId,
      managerId,
      {
        fundId,
        name: options?.name,
        openingDate: options?.openingDate,
        closingDate: options?.closingDate,
      },
      actorUserId
    );

    return this.adminActivateCycleForPoolGoLive(cycle.id);
  },

  /** Moves a cycle through draft → submitted → approved → funding for pool go-live. */
  async adminActivateCycleForPoolGoLive(cycleId: string): Promise<InvestmentCycle> {
    let cycle = await this.getById(cycleId);
    if (!cycle) throw new Error("Investment cycle not found.");

    if (cycle.status === "draft") {
      cycle = await this.adminReview(cycle.id, "submitted");
    }
    if (cycle.status === "submitted") {
      cycle = await this.adminReview(cycle.id, "approved");
    }
    if (cycle.status === "approved") {
      cycle = await this.adminReview(cycle.id, "funding");
    }

    return cycle;
  },

  async listAll(filters?: { status?: InvestmentCycleStatus }): Promise<InvestmentCycle[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    let query = db
      .from("investment_cycles")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters?.status) query = query.eq("status", filters.status);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return ((data ?? []) as CycleRow[]).map(mapCycle);
  },

  async getById(id: string): Promise<InvestmentCycle | null> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("investment_cycles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;
    return mapCycle(data as CycleRow);
  },

  async getByIdForManager(id: string): Promise<InvestmentCycle> {
    const { managerId } = await requireManagerId();
    const cycle = await this.getById(id);
    if (!cycle) throw new Error("Investment cycle not found.");
    if (cycle.poolManagerId !== managerId) throw new Error("Insufficient permissions");
    return cycle;
  },

  async create(input: CreateInvestmentCycleInput): Promise<InvestmentCycle> {
    const { userId, managerId } = await requireManagerId();
    if (!input.name?.trim()) throw new Error("Cycle name is required.");

    const strategy = await strategyService.getById(input.strategyId);
    if (!strategy) throw new Error("Strategy not found.");
    if (strategy.poolManagerId !== managerId) throw new Error("Insufficient permissions");
    if (!STRATEGY_STATUSES_FOR_CYCLES.has(strategy.status)) {
      throw new Error("Strategy must be approved before creating investment cycles.");
    }

    const capacity = sanitizeCycleCapacityFields({
      targetCapital: input.targetCapital,
      minInvestment: input.minInvestment,
      maxCapacity: input.maxCapacity,
      durationDays: input.durationDays,
    });
    const capacityError = validateCycleCapacityFields(capacity);
    if (capacityError) throw new Error(capacityError);

    const db = createAdminClient();
    const slug = input.slug?.trim() || generateInvestmentSlug(input.name);

    const { data, error } = await db
      .from("investment_cycles")
      .insert({
        strategy_id: input.strategyId,
        pool_manager_id: managerId,
        slug,
        name: input.name.trim(),
        description: input.description?.trim() ?? null,
        target_capital: capacity.targetCapital,
        min_investment: capacity.minInvestment,
        max_capacity: capacity.maxCapacity,
        funding_deadline: input.fundingDeadline ?? null,
        duration_days: capacity.durationDays,
        status: "draft",
      } as never)
      .select("*")
      .single();

    if (error) throw new Error(friendlyInvestmentCycleError(error.message));
    const cycle = mapCycle(data as CycleRow);

    await auditService.log({
      actorId: userId,
      action: "investment_cycle_created",
      entityType: "investment_cycle",
      entityId: cycle.id,
      newValues: { strategyId: cycle.strategyId, status: cycle.status },
    });

    return cycle;
  },

  async update(id: string, input: UpdateInvestmentCycleInput): Promise<InvestmentCycle> {
    const { userId, managerId } = await requireManagerId();
    const existing = await this.getById(id);
    if (!existing) throw new Error("Investment cycle not found.");
    if (existing.poolManagerId !== managerId) throw new Error("Insufficient permissions");
    if (!isInvestmentCycleEditable(existing.status)) {
      throw new Error("Investment cycle cannot be edited in its current status.");
    }

    const nextCapacity = sanitizeCycleCapacityFields({
      targetCapital:
        input.targetCapital !== undefined ? input.targetCapital : existing.targetCapital,
      minInvestment:
        input.minInvestment !== undefined ? input.minInvestment : existing.minInvestment,
      maxCapacity:
        input.maxCapacity !== undefined ? input.maxCapacity : existing.maxCapacity,
      durationDays:
        input.durationDays !== undefined ? input.durationDays : existing.durationDays,
    });
    const capacityError = validateCycleCapacityFields(nextCapacity);
    if (capacityError) throw new Error(capacityError);

    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.description !== undefined) patch.description = input.description;
    if (input.targetCapital !== undefined) patch.target_capital = nextCapacity.targetCapital;
    if (input.minInvestment !== undefined) patch.min_investment = nextCapacity.minInvestment;
    if (input.maxCapacity !== undefined) patch.max_capacity = nextCapacity.maxCapacity;
    if (input.fundingDeadline !== undefined) patch.funding_deadline = input.fundingDeadline;
    if (input.durationDays !== undefined) patch.duration_days = nextCapacity.durationDays;

    const db = createAdminClient();
    const { data, error } = await db
      .from("investment_cycles")
      .update(patch as never)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(friendlyInvestmentCycleError(error.message));
    const cycle = mapCycle(data as CycleRow);

    await auditService.log({
      actorId: userId,
      action: "investment_cycle_updated",
      entityType: "investment_cycle",
      entityId: cycle.id,
      oldValues: { status: existing.status },
      newValues: patch,
    });

    return cycle;
  },

  async transition(
    id: string,
    nextStatus: InvestmentCycleStatus,
    actor: "manager" | "admin"
  ): Promise<InvestmentCycle> {
    let userId: string;
    if (actor === "admin") {
      userId = (await requireRole(USER_ROLES.ADMINISTRATOR)).id;
    } else {
      userId = (await requireManagerId()).userId;
    }

    const existing = await this.getById(id);
    if (!existing) throw new Error("Investment cycle not found.");

    if (actor === "manager") {
      const { managerId } = await requireManagerId();
      if (existing.poolManagerId !== managerId) throw new Error("Insufficient permissions");
    }

    assertInvestmentCycleTransition(existing.status, nextStatus, actor);

    if (actor === "manager" && nextStatus === "distribution") {
      const openTrades = await tradeEntryService.listOpenByCycle(id);
      if (openTrades.length > 0) {
        throw new Error("Close all active trades before closing the investment cycle.");
      }
    }

    const now = new Date().toISOString();
    const db = createAdminClient();
    const { data, error } = await db
      .from("investment_cycles")
      .update({
        status: nextStatus,
        ...statusTimestampPatch(nextStatus, now),
      } as never)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const cycle = mapCycle(data as CycleRow);

    await auditService.log({
      actorId: userId,
      action: "investment_cycle_status_changed",
      entityType: "investment_cycle",
      entityId: cycle.id,
      oldValues: { status: existing.status },
      newValues: { status: nextStatus },
    });

    const poolManagerUserId = await resolvePoolManagerUserId(cycle.poolManagerId);
    if (nextStatus === "trading") {
      publishPlatformEvent({
        eventType: PLATFORM_EVENT_TYPES.CYCLE_STARTED,
        category: "investment",
        entityType: "investment_cycle",
        entityId: cycle.id,
        actorId: userId,
        payload: {
          poolManagerUserId,
          cycleId: cycle.id,
          cycleName: cycle.name,
          status: nextStatus,
          summary: `Cycle ${cycle.name} started trading`,
        },
      });
    } else if (nextStatus === "completed") {
      publishPlatformEvent({
        eventType: PLATFORM_EVENT_TYPES.CYCLE_COMPLETED,
        category: "investment",
        entityType: "investment_cycle",
        entityId: cycle.id,
        actorId: userId,
        payload: {
          poolManagerUserId,
          cycleId: cycle.id,
          cycleName: cycle.name,
          status: nextStatus,
          summary: `Cycle ${cycle.name} completed`,
        },
      });
    } else {
      publishPlatformEvent({
        eventType: PLATFORM_EVENT_TYPES.CYCLE_STATUS_CHANGED,
        category: "investment",
        entityType: "investment_cycle",
        entityId: cycle.id,
        actorId: userId,
        payload: {
          poolManagerUserId,
          cycleId: cycle.id,
          cycleName: cycle.name,
          previousStatus: existing.status,
          status: nextStatus,
          summary: `Cycle ${cycle.name} status changed to ${nextStatus}`,
        },
      });
    }

    if (nextStatus === "funding" && existing.fundId) {
      const { data: fundRow } = await db
        .from("funds")
        .select("*")
        .eq("id", existing.fundId)
        .maybeSingle();
      if (fundRow) {
        const deadline = computeFundingDeadline(
          fundRow as Record<string, unknown>,
          existing.closingDate
        );
        if (deadline) {
          await db
            .from("investment_cycles")
            .update({ funding_deadline: deadline } as never)
            .eq("id", id);
        }
      }
    }

    if (nextStatus === "distribution") {
      try {
        const { profitDistributionService } = await import(
          "@/services/profit-distribution.service"
        );
        await profitDistributionService.initiateSettlementForCycle(id, userId);
      } catch {
        /* settlement may require allocations — retry from finance panel */
      }
    }

    return cycle;
  },

  async adminReview(
    id: string,
    nextStatus: InvestmentCycleStatus,
    reviewNote?: string
  ): Promise<InvestmentCycle> {
    const cycle = await this.transition(id, nextStatus, "admin");
    if (reviewNote?.trim()) {
      await adminNotesService.addNote({
        entityType: "investment_cycle",
        entityId: id,
        note: reviewNote.trim(),
      });
    }
    return cycle;
  },

  async submit(id: string): Promise<InvestmentCycle> {
    return this.transition(id, "submitted", "manager");
  },

  async listPublicForInvestors(): Promise<InvestmentCycle[]> {
    return this.listPublic();
  },

  /** Public marketplace browse — no auth required. */
  async listPublic(): Promise<InvestmentCycle[]> {
    const db = createAdminClient();

    const { data: strategies, error: strategyError } = await db
      .from("strategies")
      .select("id")
      .eq("visibility", "public")
      .in("status", ["approved", "available", "operating", "paused", "archived"]);

    if (strategyError) throw new Error(strategyError.message);

    const strategyIds = ((strategies ?? []) as Array<{ id: string }>).map((s) => s.id);
    if (strategyIds.length === 0) return [];

    const { data, error } = await db
      .from("investment_cycles")
      .select("*")
      .in("strategy_id", strategyIds)
      .in("status", ["approved", "funding", "trading", "distribution", "completed"])
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return ((data ?? []) as CycleRow[]).map(mapCycle);
  },

  async getPublicBySlug(slug: string): Promise<InvestmentCycle | null> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("investment_cycles")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    const cycle = mapCycle(data as CycleRow);
    const strategy = await strategyService.getById(cycle.strategyId);
    if (!strategy || strategy.visibility !== "public") return null;
    if (!["approved", "available", "operating", "paused", "archived"].includes(strategy.status)) {
      return null;
    }
    return cycle;
  },

  async activateForLivePool(cycleId: string): Promise<InvestmentCycle> {
    const { userId, managerId } = await requireManagerId();
    const existing = await this.getById(cycleId);
    if (!existing?.fundId) throw new Error("Investment cycle not found.");
    if (existing.poolManagerId !== managerId) throw new Error("Insufficient permissions");

    const db = createAdminClient();
    const { data: fund } = await db
      .from("funds")
      .select("lifecycle_status")
      .eq("id", existing.fundId)
      .maybeSingle();
    if ((fund as { lifecycle_status?: string } | null)?.lifecycle_status !== "live") {
      throw new Error("Pool must be live before opening a new investment cycle.");
    }

    let cycle = existing;
    if (cycle.status === "draft") {
      cycle = await this.transition(cycleId, "submitted", "manager");
    }
    if (cycle.status === "submitted") {
      assertInvestmentCycleTransition(cycle.status, "approved", "admin");
      const now = new Date().toISOString();
      const { data, error } = await db
        .from("investment_cycles")
        .update({ status: "approved", approved_at: now } as never)
        .eq("id", cycleId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      cycle = mapCycle(data as CycleRow);
      await auditService.log({
        actorId: userId,
        action: "investment_cycle_status_changed",
        entityType: "investment_cycle",
        entityId: cycleId,
        oldValues: { status: "submitted" },
        newValues: { status: "approved" },
      });
    }
    if (cycle.status === "approved") {
      return this.transition(cycleId, "funding", "manager");
    }
    return cycle;
  },

  isAllocatable(status: InvestmentCycleStatus): boolean {
    return INVESTMENT_CYCLE_ALLOCATABLE_STATUSES.includes(status);
  },

  isAllocationLocked(status: InvestmentCycleStatus): boolean {
    return isCycleAtOrAfter(status, "trading");
  },
};
