import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import type { InvestmentAllocationStatus } from "@/constants/investment-allocation";
import { INVESTMENT_ALLOCATION_MUTABLE_STATUSES } from "@/constants/investment-allocation";
import { auditService } from "@/services/audit.service";
import { publishPlatformEvent, PLATFORM_EVENT_TYPES } from "@/lib/platform-events/publish";
import { investmentCycleService } from "@/services/investment-cycle.service";
import { investmentCycleMetricsService } from "@/services/investment-cycle-metrics.service";
import { generateAllocationReference } from "@/lib/investment/utils";
import { resolveAllocationRoi } from "@/lib/financial/roi-v2-distribution";
import { poolRoiService } from "@/services/pool-roi.service";
import { platformInvestmentLevelService } from "@/services/platform-investment-level.service";
import type {
  CreateInvestmentAllocationInput,
  CycleParticipantView,
  InvestmentAllocation,
} from "@/domain/investment/types";

type AllocationRow = {
  id: string;
  investment_cycle_id: string;
  investor_id: string;
  amount: number;
  currency: string;
  status: InvestmentAllocationStatus;
  reference_number: string;
  allocated_at: string;
  locked_at: string | null;
  funding_confirmed_at: string | null;
  settled_at: string | null;
  settlement_transaction_id: string | null;
  created_at: string;
  updated_at: string;
};

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function mapAllocation(row: AllocationRow): InvestmentAllocation {
  return {
    id: row.id,
    investmentCycleId: row.investment_cycle_id,
    investorId: row.investor_id,
    amount: toNumber(row.amount),
    currency: row.currency,
    status: row.status,
    referenceNumber: row.reference_number,
    allocatedAt: row.allocated_at,
    lockedAt: row.locked_at,
    fundingConfirmedAt: row.funding_confirmed_at,
    settledAt: row.settled_at,
    settlementTransactionId: row.settlement_transaction_id,
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

async function resolveAllocationRoiFields(fundId: string, amount: number) {
  const [levels, multipliers] = await Promise.all([
    platformInvestmentLevelService.listActive(),
    poolRoiService.getMultipliersForFund(fundId),
  ]);
  const resolved = resolveAllocationRoi({
    amount,
    levels,
    multipliers: multipliers.map((m) => ({
      investmentLevelId: m.investmentLevelId,
      multiplier: m.multiplier,
    })),
  });
  return resolved;
}

export const investmentAllocationService = {
  async listMine(): Promise<InvestmentAllocation[]> {
    const user = await requireAuth();
    const db = createAdminClient();
    const { data, error } = await db
      .from("investment_allocations")
      .select("*")
      .eq("investor_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return ((data ?? []) as AllocationRow[]).map(mapAllocation);
  },

  async listByCycle(cycleId: string): Promise<InvestmentAllocation[]> {
    const user = await requireAuth();
    const cycle = await investmentCycleService.getById(cycleId);
    if (!cycle) throw new Error("Investment cycle not found.");

    const isAdmin = user.role === USER_ROLES.ADMINISTRATOR;
    const managerId = await getManagerIdForUser(user.id);
    const isOwner = managerId != null && cycle.poolManagerId === managerId;

    if (!isAdmin && !isOwner) {
      throw new Error("Insufficient permissions");
    }

    const db = createAdminClient();
    const { data, error } = await db
      .from("investment_allocations")
      .select("*")
      .eq("investment_cycle_id", cycleId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return ((data ?? []) as AllocationRow[]).map(mapAllocation);
  },

  /** Trusted server-side reads — caller must already authorize cycle access. */
  async listByCycleInternal(cycleId: string): Promise<InvestmentAllocation[]> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("investment_allocations")
      .select("*")
      .eq("investment_cycle_id", cycleId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return ((data ?? []) as AllocationRow[]).map(mapAllocation);
  },

  async listParticipantsByCycle(cycleId: string): Promise<CycleParticipantView[]> {
    const user = await requireAuth();
    const cycle = await investmentCycleService.getById(cycleId);
    if (!cycle) throw new Error("Investment cycle not found.");

    const isAdmin = user.role === USER_ROLES.ADMINISTRATOR;
    const managerId = await getManagerIdForUser(user.id);
    const isOwner = managerId != null && cycle.poolManagerId === managerId;

    if (!isAdmin && !isOwner) {
      throw new Error("Insufficient permissions");
    }

    const allocations = await this.listByCycle(cycleId);
    const active = allocations.filter(
      (a) => a.status !== "cancelled" && a.status !== "rejected"
    );
    if (active.length === 0) return [];

    const investorIds = [...new Set(active.map((a) => a.investorId))];
    const db = createAdminClient();
    const { data: profiles, error: profilesError } = await db
      .from("profiles")
      .select("id, full_name")
      .in("id", investorIds);

    if (profilesError) throw new Error(profilesError.message);

    const nameById = new Map(
      ((profiles ?? []) as Array<{ id: string; full_name: string | null }>).map((p) => [
        p.id,
        p.full_name?.trim() || "Investor",
      ])
    );

    const shareBase =
      cycle.raisedCapital > 0
        ? cycle.raisedCapital
        : active.reduce((sum, a) => sum + a.amount, 0);

    return active
      .map((a) => ({
        id: a.id,
        investorId: a.investorId,
        investorName: nameById.get(a.investorId) ?? "Investor",
        amount: a.amount,
        sharePct:
          shareBase > 0
            ? Math.round((a.amount / shareBase) * 10000) / 100
            : 0,
        status: a.status,
        referenceNumber: a.referenceNumber,
        allocatedAt: a.allocatedAt,
      }))
      .sort((a, b) => b.amount - a.amount);
  },

  async listAll(filters?: {
    cycleId?: string;
    investorId?: string;
  }): Promise<InvestmentAllocation[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    let query = db
      .from("investment_allocations")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters?.cycleId) query = query.eq("investment_cycle_id", filters.cycleId);
    if (filters?.investorId) query = query.eq("investor_id", filters.investorId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return ((data ?? []) as AllocationRow[]).map(mapAllocation);
  },

  async getById(id: string): Promise<InvestmentAllocation | null> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("investment_allocations")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;
    return mapAllocation(data as AllocationRow);
  },

  /**
   * Records an allocation against a cycle in funding status.
   * Does not connect to deposits, wallets, or investor_portfolios.
   */
  async create(input: CreateInvestmentAllocationInput): Promise<InvestmentAllocation> {
    const user = await requireAuth();
    if (input.amount <= 0) throw new Error("Allocation amount must be positive.");

    const cycle = await investmentCycleService.getById(input.investmentCycleId);
    if (!cycle) throw new Error("Investment cycle not found.");
    if (!investmentCycleService.isAllocatable(cycle.status)) {
      throw new Error("Investment cycle is not accepting allocations.");
    }

    if (cycle.minInvestment != null && input.amount < cycle.minInvestment) {
      throw new Error(`Minimum investment is ${cycle.minInvestment}.`);
    }

    const committedCapital = await investmentCycleMetricsService.sumCommittedCapitalForCycle(cycle.id);
    if (cycle.maxCapacity != null && committedCapital + input.amount > cycle.maxCapacity) {
      throw new Error("Allocation would exceed cycle capacity.");
    }

    const db = createAdminClient();
    const referenceNumber = generateAllocationReference();

    const { data, error } = await db
      .from("investment_allocations")
      .insert({
        investment_cycle_id: input.investmentCycleId,
        investor_id: user.id,
        amount: input.amount,
        currency: input.currency ?? "USD",
        status: "pending",
        reference_number: referenceNumber,
      } as never)
      .select("*")
      .single();

    if (error) {
      if (error.message.includes("investment_allocations_investor_cycle_unique")) {
        throw new Error("You already have an allocation for this investment cycle.");
      }
      throw new Error(error.message);
    }

    const allocation = mapAllocation(data as AllocationRow);

    await investmentCycleMetricsService.recalculateCycleRaisedCapital(cycle.id);

    await auditService.log({
      actorId: user.id,
      action: "investment_allocation_created",
      entityType: "investment_allocation",
      entityId: allocation.id,
      newValues: {
        investmentCycleId: allocation.investmentCycleId,
        amount: allocation.amount,
        status: allocation.status,
      },
    });

    publishPlatformEvent({
      eventType: PLATFORM_EVENT_TYPES.ALLOCATION_CREATED,
      category: "investment",
      entityType: "investment_allocation",
      entityId: allocation.id,
      actorId: user.id,
      payload: {
        investorId: user.id,
        amount: allocation.amount,
        referenceNumber: allocation.referenceNumber,
        cycleId: allocation.investmentCycleId,
        cycleName: cycle.name,
        summary: `New allocation ${allocation.referenceNumber} for ${cycle.name}`,
      },
    });

    return allocation;
  },

  /** Investor may cancel a pending allocation while cycle is still in funding. */
  async cancelMine(id: string): Promise<InvestmentAllocation> {
    const user = await requireAuth();
    const existing = await this.getById(id);
    if (!existing) throw new Error("Allocation not found.");
    if (existing.investorId !== user.id) throw new Error("Insufficient permissions");
    if (existing.status !== "pending") {
      throw new Error("Only pending allocations can be cancelled.");
    }

    const cycle = await investmentCycleService.getById(existing.investmentCycleId);
    if (!cycle) throw new Error("Investment cycle not found.");
    if (!investmentCycleService.isAllocatable(cycle.status)) {
      throw new Error("Investment cycle is no longer accepting allocation changes.");
    }

    const db = createAdminClient();
    const { data, error } = await db
      .from("investment_allocations")
      .update({ status: "cancelled" } as never)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const allocation = mapAllocation(data as AllocationRow);

    await investmentCycleMetricsService.recalculateCycleRaisedCapital(cycle.id);

    await auditService.log({
      actorId: user.id,
      action: "investment_allocation_cancelled",
      entityType: "investment_allocation",
      entityId: allocation.id,
      oldValues: { status: existing.status, amount: existing.amount },
      newValues: { status: "cancelled" },
    });

    publishPlatformEvent({
      eventType: PLATFORM_EVENT_TYPES.ALLOCATION_CANCELLED,
      category: "investment",
      entityType: "investment_allocation",
      entityId: allocation.id,
      actorId: user.id,
      payload: {
        investorId: user.id,
        amount: allocation.amount,
        referenceNumber: allocation.referenceNumber,
        cycleId: allocation.investmentCycleId,
        cycleName: cycle.name,
        summary: `Allocation ${allocation.referenceNumber} cancelled`,
      },
    });

    return allocation;
  },

  async updateStatus(
    id: string,
    status: InvestmentAllocationStatus
  ): Promise<InvestmentAllocation> {
    const user = await requireRole(USER_ROLES.ADMINISTRATOR);
    const existing = await this.getById(id);
    if (!existing) throw new Error("Allocation not found.");

    const cycle = await investmentCycleService.getById(existing.investmentCycleId);
    if (!cycle) throw new Error("Investment cycle not found.");

    if (
      investmentCycleService.isAllocationLocked(cycle.status) &&
      INVESTMENT_ALLOCATION_MUTABLE_STATUSES.includes(existing.status)
    ) {
      throw new Error("Allocations are locked for this investment cycle.");
    }

    const db = createAdminClient();
    const patch: Record<string, unknown> = { status };
    if (status === "locked") patch.locked_at = new Date().toISOString();

    const { data, error } = await db
      .from("investment_allocations")
      .update(patch as never)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const allocation = mapAllocation(data as AllocationRow);

    await investmentCycleMetricsService.recalculateCycleRaisedCapital(allocation.investmentCycleId);

    await auditService.log({
      actorId: user.id,
      action: "investment_allocation_status_changed",
      entityType: "investment_allocation",
      entityId: allocation.id,
      oldValues: { status: existing.status },
      newValues: { status },
    });

    return allocation;
  },

  /**
   * After a marketplace join (wallet debit), attach the investment to the active cycle
   * so Raised Capital / investor count update on PM + marketplace views.
   */
  async recordMarketplaceJoin(input: {
    cycleId: string;
    investorId: string;
    amount: number;
  }): Promise<InvestmentAllocation> {
    if (input.amount <= 0) throw new Error("Allocation amount must be positive.");

    const cycle = await investmentCycleService.getById(input.cycleId);
    if (!cycle) throw new Error("Investment cycle not found.");
    if (cycle.status !== "funding" && cycle.status !== "approved") {
      throw new Error("Investment cycle is not accepting allocations.");
    }

    const db = createAdminClient();
    const { data: existingRow } = await db
      .from("investment_allocations")
      .select("*")
      .eq("investment_cycle_id", input.cycleId)
      .eq("investor_id", input.investorId)
      .maybeSingle();

    const existing = existingRow ? mapAllocation(existingRow as AllocationRow) : null;
    const now = new Date().toISOString();

    if (existing && existing.status !== "cancelled" && existing.status !== "rejected") {
      const nextAmount = existing.amount + input.amount;
      const roiFields =
        cycle.fundId != null
          ? await resolveAllocationRoiFields(cycle.fundId, nextAmount)
          : null;
      const { data, error } = await db
        .from("investment_allocations")
        .update({
          amount: nextAmount,
          status: "funding_confirmed",
          funding_confirmed_at: existing.fundingConfirmedAt ?? now,
          ...(roiFields
            ? {
                investment_level_id: roiFields.investmentLevelId,
                roi_multiplier: roiFields.roiMultiplier,
                projected_payout: roiFields.projectedPayout,
              }
            : {}),
        } as never)
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error || !data) throw new Error(error?.message ?? "Could not update allocation.");
      await investmentCycleMetricsService.recalculateCycleRaisedCapital(input.cycleId);
      return mapAllocation(data as AllocationRow);
    }

    const roiFields =
      cycle.fundId != null
        ? await resolveAllocationRoiFields(cycle.fundId, input.amount)
        : null;

    const { data, error } = await db
      .from("investment_allocations")
      .insert({
        investment_cycle_id: input.cycleId,
        investor_id: input.investorId,
        amount: input.amount,
        currency: "USD",
        status: "funding_confirmed",
        funding_confirmed_at: now,
        reference_number: generateAllocationReference(),
        ...(roiFields
          ? {
              investment_level_id: roiFields.investmentLevelId,
              roi_multiplier: roiFields.roiMultiplier,
              projected_payout: roiFields.projectedPayout,
            }
          : {}),
      } as never)
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Could not create allocation.");
    await investmentCycleMetricsService.recalculateCycleRaisedCapital(input.cycleId);
    return mapAllocation(data as AllocationRow);
  },

  /**
   * Disabled: investors must explicitly join each funding cycle or reinvest after closure.
   * Returns live raised capital from confirmed cycle allocations only.
   */
  async syncPortfolioInvestmentsToCycle(_fundId: string, cycleId: string): Promise<number> {
    return investmentCycleMetricsService.sumRaisedCapitalForCycle(cycleId);
  },

  /** Clear cycle allocation when an investor fully exits a pool. */
  async cancelMarketplaceParticipation(input: {
    cycleId: string;
    investorId: string;
  }): Promise<void> {
    const db = createAdminClient();
    const { data: existingRow } = await db
      .from("investment_allocations")
      .select("id, status")
      .eq("investment_cycle_id", input.cycleId)
      .eq("investor_id", input.investorId)
      .maybeSingle();

    const existing = existingRow as { id: string; status: string } | null;
    if (!existing || existing.status === "cancelled" || existing.status === "rejected") {
      return;
    }

    await db
      .from("investment_allocations")
      .update({ status: "cancelled" } as never)
      .eq("id", existing.id);

    await investmentCycleMetricsService.recalculateCycleRaisedCapital(input.cycleId);
  },
};
