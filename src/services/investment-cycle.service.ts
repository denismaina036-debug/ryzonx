import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { userOwnsPoolManager } from "@/lib/auth/pool-manager-access";
import { USER_ROLES } from "@/constants/roles";
import type { InvestmentCycleStatus } from "@/constants/investment-cycle";
import { INVESTMENT_CYCLE_ALLOCATABLE_STATUSES } from "@/constants/investment-cycle";
import { evaluateCycleCreation } from "@/domain/investment/cycle-creation-policy";
import { auditService } from "@/services/audit.service";
import { strategyService } from "@/services/strategy.service";
import { tradingJournalService } from "@/services/trading-journal.service";
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
import { poolManagerPerformanceStatsService } from "@/services/pool-manager-performance-stats.service";
import type {
  CreateInvestmentCycleInput,
  CreatePoolInvestmentCycleInput,
  InvestmentCycle,
  UpdateInvestmentCycleInput,
} from "@/domain/investment/types";
import {
  applyCycleSnapshotOverrides,
  buildPoolConfigSnapshot,
  type PoolConfigSnapshot,
} from "@/domain/pools/pool-config-snapshot";
import {
  friendlyInvestmentCycleError,
  resolveCycleDurationDays,
  sanitizeCycleCapacityFields,
  validateCycleCapacityFields,
  validateCycleReturnDuration,
  validateCycleRoiMultipliers,
} from "@/domain/investment/cycle-validation";
import {
  inferReturnDurationPreset,
  resolveReturnDuration,
} from "@/domain/roi/return-duration";
import type { ReturnDurationPreset, ReturnDurationUnit } from "@/domain/roi/types";
import { investmentCycleMetricsService } from "@/services/investment-cycle-metrics.service";
import { poolRoiService } from "@/services/pool-roi.service";

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
  target_investors: number | null;
  raised_capital: number;
  current_cycle_profit: number | null;
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
    targetInvestors: row.target_investors != null ? toNumber(row.target_investors) : null,
    raisedCapital: toNumber(row.raised_capital),
    currentCycleProfit: toNumber(row.current_cycle_profit),
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

async function mapCyclesWithLiveMetrics(rows: CycleRow[]): Promise<InvestmentCycle[]> {
  return investmentCycleMetricsService.enrichCycles(rows.map(mapCycle));
}

async function mapCycleWithLiveMetrics(row: CycleRow): Promise<InvestmentCycle> {
  const cycles = await mapCyclesWithLiveMetrics([row]);
  const cycle = cycles[0];
  if (!cycle) throw new Error("Investment cycle not found.");
  return cycle;
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
  now: string,
  existing?: InvestmentCycle | null
): Partial<CycleRow> {
  switch (status) {
    case "submitted":
      return existing?.submittedAt ? {} : { submitted_at: now };
    case "approved":
      return existing?.approvedAt ? {} : { approved_at: now };
    case "funding":
      // Funding Start is fixed once set unless a PM explicitly edits it later.
      return existing?.fundingStartedAt ? {} : { funding_started_at: now };
    case "trading":
      return {
        ...(existing?.tradingStartedAt ? {} : { trading_started_at: now }),
        ...(existing?.fundingStartedAt ? {} : { funding_started_at: now }),
      };
    case "distribution":
      return existing?.distributionStartedAt ? {} : { distribution_started_at: now };
    case "completed":
      return existing?.completedAt ? {} : { completed_at: now };
    case "archived":
      return existing?.archivedAt ? {} : { archived_at: now };
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

function positiveNumber(value: unknown): number | null {
  const n = toNumber(value as string | number | null | undefined);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function readFundReturnDuration(fund: Record<string, unknown>): {
  preset: ReturnDurationPreset;
  value: number;
  unit: ReturnDurationUnit;
  durationDays: number;
} {
  const preset = inferReturnDurationPreset({
    preset: fund.return_duration_preset as ReturnDurationPreset | null,
    value: fund.return_duration_value as number | null,
    unit: fund.return_duration_unit as ReturnDurationUnit | null,
  });
  const resolved = resolveReturnDuration({
    preset,
    value: positiveNumber(fund.return_duration_value) ?? positiveNumber(fund.pool_duration_days),
    unit: (fund.return_duration_unit as ReturnDurationUnit | null) ?? "days",
  });
  return {
    preset,
    value: resolved.value,
    unit: resolved.unit,
    durationDays: resolveCycleDurationDays({
      preset,
      value: resolved.value,
      unit: resolved.unit,
    }),
  };
}

function resolveCycleReturnDurationInput(
  partial: Partial<CreatePoolInvestmentCycleInput>
): {
  preset: ReturnDurationPreset;
  value: number;
  unit: ReturnDurationUnit;
  durationDays: number;
} {
  const preset = partial.returnDurationPreset;
  if (!preset) {
    throw new Error("Payout duration is required for this cycle.");
  }
  const unit = partial.returnDurationUnit ?? "days";
  const value = positiveNumber(partial.returnDurationValue) ?? (preset === "daily" ? 1 : null);
  const validationError = validateCycleReturnDuration({ preset, value, unit });
  if (validationError) throw new Error(validationError);
  const resolved = resolveReturnDuration({ preset, value, unit });
  return {
    preset,
    value: resolved.value,
    unit: resolved.unit,
    durationDays: resolveCycleDurationDays({
      preset,
      value: resolved.value,
      unit: resolved.unit,
    }),
  };
}

function buildCycleInputFromPool(
  fund: Record<string, unknown>,
  fundId: string,
  cycleNumber: number,
  partial: Partial<CreatePoolInvestmentCycleInput> & { fundId: string },
  options: { inheritPoolDefaults: boolean }
): CreatePoolInvestmentCycleInput {
  const poolName = (fund.name as string) ?? "Pool";

  if (!options.inheritPoolDefaults) {
    const targetCapital = positiveNumber(partial.targetCapital);
    const minInvestment = positiveNumber(partial.minInvestment);
    const targetInvestors = positiveNumber(partial.targetInvestors);
    if (!targetCapital) throw new Error("Target capital is required for this cycle.");
    if (!minInvestment) throw new Error("Minimum investment is required for this cycle.");
    if (!targetInvestors) throw new Error("Target investors is required for this cycle.");

    const returnDuration = resolveCycleReturnDurationInput(partial);
    const initialRaisedCapital = positiveNumber(partial.initialRaisedCapital) ?? undefined;
    const roiValidationError = validateCycleRoiMultipliers(
      (partial.roiMultipliers ?? []).map((entry) => ({
        investmentLevelId: entry.investmentLevelId,
        multiplier: entry.multiplier,
      }))
    );
    if (roiValidationError) throw new Error(roiValidationError);
    return {
      fundId,
      name: partial.name?.trim() || `${poolName} — Cycle ${cycleNumber}`,
      durationDays: returnDuration.durationDays,
      minInvestment,
      targetCapital,
      targetInvestors: Math.floor(targetInvestors),
      returnDurationPreset: returnDuration.preset,
      returnDurationValue: returnDuration.value,
      returnDurationUnit: returnDuration.unit,
      initialRaisedCapital,
      maxCapacity:
        positiveNumber(partial.maxCapacity) ?? targetCapital,
      roiMultipliers: partial.roiMultipliers,
      openingDate: partial.openingDate,
      closingDate: partial.closingDate,
    };
  }

  const fundReturnDuration = readFundReturnDuration(fund);
  const targetCapital =
    positiveNumber(partial.targetCapital) ??
    positiveNumber(fund.target_capital) ??
    1000;
  const targetInvestors =
    positiveNumber(partial.targetInvestors) ??
    positiveNumber(fund.target_investors) ??
    positiveNumber(fund.max_investors_cap) ??
    10;
  const inheritedReturnDuration = partial.returnDurationPreset
    ? resolveCycleReturnDurationInput(partial)
    : fundReturnDuration;
  return {
    fundId,
    name: partial.name?.trim() || `${poolName} — Cycle ${cycleNumber}`,
    durationDays:
      positiveNumber(partial.durationDays) ?? inheritedReturnDuration.durationDays,
    minInvestment:
      positiveNumber(partial.minInvestment) ??
      positiveNumber(fund.min_investment) ??
      100,
    targetCapital,
    targetInvestors: Math.floor(targetInvestors),
    returnDurationPreset: inheritedReturnDuration.preset,
    returnDurationValue: inheritedReturnDuration.value,
    returnDurationUnit: inheritedReturnDuration.unit,
    initialRaisedCapital: positiveNumber(partial.initialRaisedCapital) ?? undefined,
    maxCapacity:
      positiveNumber(partial.maxCapacity) ??
      positiveNumber(fund.max_aum) ??
      targetCapital,
    roiMultipliers: partial.roiMultipliers,
    openingDate: partial.openingDate,
    closingDate: partial.closingDate,
  };
}

async function insertCycleFromPoolFund(
  fund: Record<string, unknown>,
  fundId: string,
  managerId: string,
  input: Partial<CreatePoolInvestmentCycleInput> & { fundId: string },
  actorUserId: string | null,
  options: { inheritPoolDefaults: boolean }
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
    .select("cycle_number, status, raised_capital, max_capacity")
    .eq("fund_id", fundId)
    .order("cycle_number", { ascending: false })
    .limit(1);

  const lastCycle = (existingCycles ?? [])[0] as
    | {
        cycle_number: number;
        status: InvestmentCycleStatus;
        raised_capital: number | string;
        max_capacity: number | string | null;
      }
    | undefined;

  if (lastCycle) {
    const decision = evaluateCycleCreation(
      [
        {
          cycleNumber: lastCycle.cycle_number,
          status: lastCycle.status,
          raisedCapital: toNumber(lastCycle.raised_capital),
          maxCapacity:
            lastCycle.max_capacity == null ? null : toNumber(lastCycle.max_capacity),
        },
      ],
      true
    );
    if (!decision.allowed) {
      if (decision.reason === "funding_cycle_open") {
        throw new Error(
          "The current funding cycle must be full or moved to trading before opening another funding cycle."
        );
      }
      if (decision.reason === "distribution_in_progress") {
        throw new Error(
          "Complete the current cycle distribution before opening another funding cycle."
        );
      }
      throw new Error("Finish the current cycle transition before opening a new cycle.");
    }
  }

  const cycleNumber = (lastCycle?.cycle_number ?? 0) + 1;
  const resolvedInput = buildCycleInputFromPool(fund, fundId, cycleNumber, input, options);
  const poolVersion = (fund.pool_config_version as number | undefined) ?? 1;
  const poolFundId = fund.id as string;

  const defaultMultipliers = (await poolRoiService.getCompleteMultipliers(poolFundId)).map((m) => ({
    investmentLevelId: m.investmentLevelId,
    multiplier: m.multiplier,
  }));

  const capacity = sanitizeCycleCapacityFields({
    targetCapital: resolvedInput.targetCapital,
    minInvestment: resolvedInput.minInvestment,
    maxCapacity: resolvedInput.maxCapacity ?? resolvedInput.targetCapital,
    durationDays: resolvedInput.durationDays,
  });

  const validationError = validateCycleCapacityFields({
    ...capacity,
  });
  if (validationError) throw new Error(validationError);

  if (!resolvedInput.name?.trim()) throw new Error("Cycle name is required.");
  const targetInvestors = Math.floor(Number(resolvedInput.targetInvestors));
  if (!Number.isFinite(targetInvestors) || targetInvestors <= 0) {
    throw new Error("Target investors must be a whole number greater than zero.");
  }

  const roiMultipliers =
    resolvedInput.roiMultipliers && resolvedInput.roiMultipliers.length > 0
      ? resolvedInput.roiMultipliers
      : defaultMultipliers;

  const baseSnapshot = buildPoolConfigSnapshot(fund, strategyId, poolVersion, defaultMultipliers);
  const initialRaisedCapital =
    resolvedInput.initialRaisedCapital != null && resolvedInput.initialRaisedCapital > 0
      ? resolvedInput.initialRaisedCapital
      : null;
  const snapshot = applyCycleSnapshotOverrides(baseSnapshot, {
    minInvestment: capacity.minInvestment,
    targetCapital: capacity.targetCapital,
    initialRaisedCapital,
    maxCapacity: capacity.maxCapacity,
    maxInvestorsCap: targetInvestors,
    poolDurationDays: capacity.durationDays,
    returnDurationPreset: resolvedInput.returnDurationPreset,
    returnDurationValue: resolvedInput.returnDurationValue,
    returnDurationUnit: resolvedInput.returnDurationUnit,
    roiMultipliers,
  });

  const poolName = (fund.name as string) ?? "Pool";
  const cycleName = resolvedInput.name.trim() || `${poolName} — Cycle ${cycleNumber}`;
  const slug = `${(fund.slug as string) ?? "pool"}-cycle-${cycleNumber}`;

  const openingDate = resolvedInput.openingDate
    ? new Date(resolvedInput.openingDate).toISOString()
    : null;
  const closingDate = resolvedInput.closingDate
    ? new Date(resolvedInput.closingDate).toISOString()
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
      target_investors: targetInvestors,
      duration_days: capacity.durationDays,
      opening_date: openingDate,
      closing_date: closingDate,
      funding_deadline: fundingDeadline,
      raised_capital: initialRaisedCapital ?? 0,
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

async function assertNoOtherCycleIsTrading(
  fundId: string | null,
  cycleId: string
): Promise<void> {
  if (!fundId) return;

  const db = createAdminClient();
  const { data, error } = await db
    .from("investment_cycles")
    .select("id, name, status")
    .eq("fund_id", fundId)
    .neq("id", cycleId)
    .in("status", ["trading", "distribution"])
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (data) {
    const active = data as { name: string; status: InvestmentCycleStatus };
    throw new Error(
      `${active.name} is still ${active.status}. Keep this cycle in funding until the active trading cycle is closed.`
    );
  }
}

export type CloseInvestmentCycleAction = "create_new_cycle";

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
    return mapCyclesWithLiveMetrics((data ?? []) as CycleRow[]);
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
    return mapCyclesWithLiveMetrics((data ?? []) as CycleRow[]);
  },

  async listByFund(fundId: string): Promise<InvestmentCycle[]> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("investment_cycles")
      .select("*")
      .eq("fund_id", fundId)
      .order("cycle_number", { ascending: true });

    if (error) throw new Error(error.message);
    return mapCyclesWithLiveMetrics((data ?? []) as CycleRow[]);
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
      if (match) return mapCycleWithLiveMetrics(match);
    }
    return null;
  },

  /** Whether the pool currently has capital deployed in an active trading cycle. */
  async hasTradingCycleForFund(fundId: string): Promise<boolean> {
    const tradingFundIds = await this.listTradingCycleFundIds([fundId]);
    return tradingFundIds.has(fundId);
  },

  async listTradingCycleFundIds(fundIds: string[]): Promise<Set<string>> {
    if (fundIds.length === 0) return new Set();

    const db = createAdminClient();
    const { data, error } = await db
      .from("investment_cycles")
      .select("fund_id")
      .in("fund_id", fundIds)
      .in("status", ["trading", "distribution"]);

    if (error) throw new Error(error.message);

    return new Set(
      ((data ?? []) as Array<{ fund_id: string }>).map((row) => row.fund_id)
    );
  },

  /** Pools currently accepting new funding round investments. */
  async listFundingCycleFundIds(fundIds: string[]): Promise<Set<string>> {
    if (fundIds.length === 0) return new Set();

    const db = createAdminClient();
    const { data, error } = await db
      .from("investment_cycles")
      .select("fund_id")
      .in("fund_id", fundIds)
      .in("status", ["funding", "approved"]);

    if (error) throw new Error(error.message);

    return new Set(
      ((data ?? []) as Array<{ fund_id: string }>).map((row) => row.fund_id)
    );
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
      {
        fundId,
        openingDate,
        closingDate,
      },
      actorUserId,
      { inheritPoolDefaults: true }
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

    return insertCycleFromPoolFund(fund, input.fundId, managerId, input, userId, {
      inheritPoolDefaults: false,
    });
  },

  /** System/admin auto-create next cycle without manager session. */
  async createFromPoolAsSystem(
    input: CreatePoolInvestmentCycleInput & { actorUserId: string }
  ): Promise<InvestmentCycle> {
    const db = createAdminClient();
    const { data: fundRow, error: fundError } = await db
      .from("funds")
      .select("*")
      .eq("id", input.fundId)
      .single();
    if (fundError || !fundRow) throw new Error("Pool not found.");
    const fund = fundRow as Record<string, unknown>;
    const managerId = fund.pool_manager_id as string;
    if (!managerId) throw new Error("Pool has no assigned manager.");

    const { actorUserId, ...cycleInput } = input;
    return insertCycleFromPoolFund(fund, input.fundId, managerId, cycleInput, actorUserId, {
      inheritPoolDefaults: false,
    });
  },

  async createFirstCycleForApprovedPool(
    fundId: string,
    actorUserId: string,
    options?: Partial<Omit<CreatePoolInvestmentCycleInput, "fundId">>
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
        durationDays: options?.durationDays,
        minInvestment: options?.minInvestment,
        targetCapital: options?.targetCapital,
        targetInvestors: options?.targetInvestors,
        initialRaisedCapital: options?.initialRaisedCapital,
        maxCapacity: options?.maxCapacity,
        roiMultipliers: options?.roiMultipliers,
        openingDate: options?.openingDate,
        closingDate: options?.closingDate,
      },
      actorUserId,
      { inheritPoolDefaults: true }
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
    return mapCyclesWithLiveMetrics((data ?? []) as CycleRow[]);
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
    return mapCycleWithLiveMetrics(data as CycleRow);
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

    if (nextStatus === "trading") {
      await assertNoOtherCycleIsTrading(existing.fundId, existing.id);
    }

    if (
      actor === "manager" &&
      (nextStatus === "funding" || nextStatus === "completed") &&
      (existing.status === "trading" || existing.status === "distribution")
    ) {
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
        ...statusTimestampPatch(nextStatus, now, existing),
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
      try {
        await tradingJournalService.getOrCreateForCycle(id);
      } catch {
        /* journal opens on first trade if creation fails */
      }
      if (existing.fundId) {
        try {
          const { cycleLifecycleOrchestrator } = await import(
            "@/services/investment-engine/cycle-lifecycle-orchestrator.service"
          );
          await cycleLifecycleOrchestrator.onTradingStarted(id, existing.fundId);
        } catch {
          /* snapshot failure should not block trading */
        }
      }
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
    } else if (nextStatus === "funding") {
      publishPlatformEvent({
        eventType: PLATFORM_EVENT_TYPES.CYCLE_FUNDING_OPENED,
        category: "investment",
        entityType: "investment_cycle",
        entityId: cycle.id,
        actorId: userId,
        payload: {
          poolManagerUserId,
          cycleId: cycle.id,
          cycleName: cycle.name,
          fundId: cycle.fundId,
          status: nextStatus,
          summary: `Cycle ${cycle.name} opened for funding`,
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

    if (nextStatus === "completed" || nextStatus === "archived") {
      await poolManagerPerformanceStatsService
        .syncManager(
          cycle.poolManagerId,
          `Cycle ${cycle.name} ${nextStatus === "completed" ? "completed" : "archived"}`
        )
        .catch(() => undefined);
    } else if (nextStatus === "funding" && existing.fundId) {
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

    return cycle;
  },

  /** Internal lifecycle transition (settlement / queue engine) — no session role required. */
  async systemTransition(
    id: string,
    nextStatus: InvestmentCycleStatus,
    actorUserId: string
  ): Promise<InvestmentCycle> {
    const existing = await this.getById(id);
    if (!existing) throw new Error("Investment cycle not found.");

    assertInvestmentCycleTransition(existing.status, nextStatus, "admin");

    if (nextStatus === "trading") {
      await assertNoOtherCycleIsTrading(existing.fundId, existing.id);
    }

    const now = new Date().toISOString();
    const db = createAdminClient();
    const { data, error } = await db
      .from("investment_cycles")
      .update({
        status: nextStatus,
        ...statusTimestampPatch(nextStatus, now, existing),
      } as never)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const cycle = mapCycle(data as CycleRow);

    await auditService.log({
      actorId: actorUserId,
      action: "investment_cycle_status_changed",
      entityType: "investment_cycle",
      entityId: cycle.id,
      oldValues: { status: existing.status },
      newValues: { status: nextStatus, system: true },
    });

    if (nextStatus === "trading" && existing.fundId) {
      try {
        const { cycleLifecycleOrchestrator } = await import(
          "@/services/investment-engine/cycle-lifecycle-orchestrator.service"
        );
        await cycleLifecycleOrchestrator.onTradingStarted(id, existing.fundId);
      } catch {
        /* snapshot optional */
      }
    }

    const poolManagerUserId = await resolvePoolManagerUserId(cycle.poolManagerId);
    if (nextStatus === "trading") {
      publishPlatformEvent({
        eventType: PLATFORM_EVENT_TYPES.CYCLE_STARTED,
        category: "investment",
        entityType: "investment_cycle",
        entityId: cycle.id,
        actorId: actorUserId,
        payload: {
          poolManagerUserId,
          cycleId: cycle.id,
          cycleName: cycle.name,
          fundId: cycle.fundId,
          status: nextStatus,
          summary: `Cycle ${cycle.name} started trading`,
        },
      });
    } else if (nextStatus === "funding") {
      publishPlatformEvent({
        eventType: PLATFORM_EVENT_TYPES.CYCLE_FUNDING_OPENED,
        category: "investment",
        entityType: "investment_cycle",
        entityId: cycle.id,
        actorId: actorUserId,
        payload: {
          poolManagerUserId,
          cycleId: cycle.id,
          cycleName: cycle.name,
          fundId: cycle.fundId,
          status: nextStatus,
          summary: `Cycle ${cycle.name} opened for funding`,
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

    return cycle;
  },

  async systemActivateCycleForFunding(cycleId: string, actorUserId: string): Promise<InvestmentCycle> {
    let cycle = await this.getById(cycleId);
    if (!cycle) throw new Error("Investment cycle not found.");

    if (cycle.status === "draft") {
      cycle = await this.systemTransition(cycle.id, "submitted", actorUserId);
    }
    if (cycle.status === "submitted") {
      cycle = await this.systemTransition(cycle.id, "approved", actorUserId);
    }
    if (cycle.status === "approved") {
      cycle = await this.systemTransition(cycle.id, "funding", actorUserId);
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

  /** Distribute the cycle result without closing the cycle. */
  async distributeProfits(id: string, actor: "manager" | "admin"): Promise<InvestmentCycle> {
    const existing = await this.getById(id);
    if (!existing) throw new Error("Investment cycle not found.");

    if (existing.status !== "trading" && existing.status !== "distribution") {
      throw new Error("Cycle results can only be distributed while the cycle is trading.");
    }

    let actorId: string;
    if (actor === "admin") {
      actorId = (await requireRole(USER_ROLES.ADMINISTRATOR)).id;
    } else {
      const user = await requireAuth();
      if (!(await userOwnsPoolManager(user.id, existing.poolManagerId))) {
        throw new Error("Insufficient permissions");
      }
      actorId = user.id;
    }

    const { profitDistributionService } = await import(
      "@/services/profit-distribution.service"
    );
    await profitDistributionService.finalizeCycleProfits(id, actorId);
    const refreshed = await this.getById(id);
    if (!refreshed) throw new Error("Investment cycle not found.");
    return refreshed;
  },

  /** Mark a cycle completed after its result is distributed. Investors then choose reinvest, withdraw, or move capital. */
  async closeCycle(
    id: string,
    actor: "manager" | "admin"
  ): Promise<{ cycle: InvestmentCycle }> {
    const existing = await this.getById(id);
    if (!existing) throw new Error("Investment cycle not found.");

    if (existing.status !== "trading" && existing.status !== "distribution") {
      throw new Error("This cycle cannot be closed in its current status.");
    }

    let actorId: string;
    if (actor === "admin") {
      actorId = (await requireRole(USER_ROLES.ADMINISTRATOR)).id;
    } else {
      const user = await requireAuth();
      if (!(await userOwnsPoolManager(user.id, existing.poolManagerId))) {
        throw new Error("Insufficient permissions");
      }
      actorId = user.id;
    }

    const openTrades = await tradeEntryService.listOpenByCycle(id);
    if (openTrades.length > 0) {
      throw new Error("Close all active trades before closing the investment cycle.");
    }

    const { profitDistributionService } = await import("@/services/profit-distribution.service");
    const hasInvestorAllocations =
      await profitDistributionService.hasInvestorAllocationsForSettlement(id);

    if (hasInvestorAllocations) {
      const settlement = await profitDistributionService.getByCycleId(id);
      if (!settlement || settlement.status !== "completed") {
        throw new Error("Distribute the cycle result before closing this cycle.");
      }
    } else {
      const grossProfit = await profitDistributionService.getCycleGrossTradingProfit(id);
      if (grossProfit > 0) {
        let settlement = await profitDistributionService.getByCycleId(id);
        if (!settlement || settlement.status !== "completed") {
          await profitDistributionService.finalizeCycleProfits(id, actorId);
          settlement = await profitDistributionService.getByCycleId(id);
        }
        if (!settlement || settlement.status !== "completed") {
          throw new Error("Could not finalize pool manager profit before closing this cycle.");
        }
      }
    }

    const cycle = await this.transition(id, "completed", actor);

    if (existing.fundId && hasInvestorAllocations) {
      const { cycleInvestorSettlementService } = await import(
        "@/services/investment-engine/cycle-investor-settlement.service"
      );
      await cycleInvestorSettlementService.createPendingChoicesForCycle(id, existing.fundId);
    }

    return { cycle };
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
    return mapCyclesWithLiveMetrics((data ?? []) as CycleRow[]);
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

    const cycle = await mapCycleWithLiveMetrics(data as CycleRow);
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
