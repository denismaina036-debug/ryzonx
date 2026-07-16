import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import {
  ALLOCATION_STATUS,
  CAPITAL_COMMITTEE_LABELS,
  CAPITAL_REPORT_LABELS,
} from "@/constants/capital-allocation";
import type {
  CapitalAllocationDashboard,
  CapitalAllocationRecord,
  CapitalAllocationSummary,
  CapitalMetrics,
  CapitalSettings,
  ManagerRanking,
  PoolCapitalBreakdown,
} from "@/domain/capital-allocation/types";
import { auditService } from "@/services/audit.service";
import { notificationService } from "@/services/notification.service";

const SETTINGS_ID = "00000000-0000-4000-a000-000000000002";

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

async function getActorId(): Promise<string> {
  const user = await requireRole(USER_ROLES.ADMINISTRATOR);
  return user.id;
}

async function syncFundAum(fundId: string): Promise<void> {
  const db = createAdminClient();
  const { data: fund } = await db
    .from("funds")
    .select("investor_capital, ryvonx_capital")
    .eq("id", fundId)
    .single();
  if (!fund) return;
  const row = fund as { investor_capital: number; ryvonx_capital: number };
  const total = toNumber(row.investor_capital) + toNumber(row.ryvonx_capital);
  await db
    .from("funds")
    .update({
      assets_under_management: total,
      current_capital: toNumber(row.investor_capital),
    } as never)
    .eq("id", fundId);
}

async function notifyManager(
  poolManagerId: string | null,
  input: { type: string; title: string; message: string; metadata?: Record<string, unknown> }
): Promise<void> {
  if (!poolManagerId) return;
  const db = createAdminClient();
  const { data: mgr } = await db
    .from("pool_managers")
    .select("user_id")
    .eq("id", poolManagerId)
    .maybeSingle();
  const userId = (mgr as { user_id?: string } | null)?.user_id;
  if (!userId) return;
  await notificationService.sendToUser({
    userId,
    type: input.type,
    title: input.title,
    message: input.message,
    metadata: input.metadata,
  });
}

function mapPoolSummary(row: Record<string, unknown>, managerName: string | null): CapitalAllocationSummary {
  const investor = toNumber(row.investor_capital as number);
  const ryvonx = toNumber(row.ryvonx_capital as number);
  const total = investor + ryvonx;
  return {
    fundId: row.id as string,
    fundName: row.name as string,
    managerId: (row.pool_manager_id as string | null) ?? null,
    managerName,
    managerLevel: (row.manager_level as string | null) ?? null,
    investorCapital: investor,
    ryvonxCapital: ryvonx,
    totalAum: total,
    investorPct: pct(investor, total),
    ryvonxPct: pct(ryvonx, total),
    allocationStatus: (row.allocation_status as string) ?? "none",
    isRyvonxBacked: Boolean(row.is_ryvonx_backed),
    growthRatePct: row.growth_rate_pct != null ? toNumber(row.growth_rate_pct as number) : null,
    activeInvestors: toNumber(row.active_investors as number),
    nextReviewAt: (row.allocation_review_at as string | null) ?? null,
  };
}

export const poolCapitalAllocationService = {
  async getSettings(): Promise<CapitalSettings> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data } = await db.from("ryvonx_capital_settings").select("*").eq("id", SETTINGS_ID).single();
    const row = (data ?? {}) as Record<string, unknown>;
    return {
      totalAvailableCapital: toNumber(row.total_available_capital as number),
      totalAllocatedCapital: toNumber(row.total_allocated_capital as number),
      minAllocation: row.min_allocation != null ? toNumber(row.min_allocation as number) : null,
      maxAllocation: row.max_allocation != null ? toNumber(row.max_allocation as number) : null,
      defaultReviewFrequency: (row.default_review_frequency as string | null) ?? null,
      performanceExpectations: (row.performance_expectations as string | null) ?? null,
    };
  },

  async updateSettings(input: Partial<CapitalSettings>): Promise<void> {
    const actorId = await getActorId();
    const db = createAdminClient();
    const updates: Record<string, unknown> = { updated_by: actorId, updated_at: new Date().toISOString() };
    if (input.totalAvailableCapital != null) updates.total_available_capital = input.totalAvailableCapital;
    if (input.minAllocation != null) updates.min_allocation = input.minAllocation;
    if (input.maxAllocation != null) updates.max_allocation = input.maxAllocation;
    if (input.defaultReviewFrequency != null) updates.default_review_frequency = input.defaultReviewFrequency;
    if (input.performanceExpectations != null) updates.performance_expectations = input.performanceExpectations;

    await db.from("ryvonx_capital_settings").update(updates as never).eq("id", SETTINGS_ID);
    await auditService.log({
      actorId,
      action: "capital_settings_updated",
      entityType: "ryvonx_capital_settings",
      entityId: SETTINGS_ID,
      newValues: updates,
    });
  },

  async getDashboard(): Promise<CapitalAllocationDashboard> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const [settings, fundsRes, historyRes, managersRes] = await Promise.all([
      poolCapitalAllocationService.getSettings(),
      db.from("funds").select("*").neq("status", "archived"),
      db
        .from("pool_capital_allocations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30),
      db.from("pool_managers").select("id, display_name, manager_level"),
    ]);

    const managerMap = new Map<string, { name: string; level: string }>();
    for (const m of managersRes.data ?? []) {
      const r = m as { id: string; display_name: string; manager_level: string };
      managerMap.set(r.id, { name: r.display_name, level: r.manager_level });
    }

    const pools = (fundsRes.data ?? []).map((f) => {
      const row = f as Record<string, unknown>;
      const mgrId = row.pool_manager_id as string | null;
      const mgr = mgrId ? managerMap.get(mgrId) : null;
      return mapPoolSummary({ ...row, manager_level: mgr?.level ?? null }, mgr?.name ?? null);
    });

    const activeAllocations = pools.filter((p) =>
      ["active", "approved"].includes(p.allocationStatus)
    );
    const pendingReviews = pools.filter((p) =>
      ["candidate", "under_review"].includes(p.allocationStatus)
    );
    const candidates = pools.filter((p) => p.allocationStatus === "candidate");

    const fundNameMap = new Map(pools.map((p) => [p.fundId, p.fundName]));
    const recentHistory: CapitalAllocationRecord[] = (historyRes.data ?? []).map((h) => {
      const r = h as Record<string, unknown>;
      const mgrId = r.pool_manager_id as string | null;
      return {
        id: r.id as string,
        fundId: r.fund_id as string,
        fundName: fundNameMap.get(r.fund_id as string) ?? "Unknown",
        managerName: mgrId ? managerMap.get(mgrId)?.name ?? null : null,
        action: r.action as string,
        amount: toNumber(r.amount as number),
        previousAmount: r.previous_amount != null ? toNumber(r.previous_amount as number) : null,
        status: r.status as string,
        committeeLabel: (r.committee_label as string | null) ?? null,
        reviewNotes: (r.review_notes as string | null) ?? null,
        decidedAt: (r.decided_at as string | null) ?? null,
        createdAt: r.created_at as string,
      };
    });

    const managerRankings: ManagerRanking[] = [...managerMap.entries()]
      .map(([managerId, mgr]) => {
        const mgrPools = pools.filter((p) => p.managerId === managerId);
        return {
          managerId,
          displayName: mgr.name,
          managerLevel: mgr.level,
          totalAum: mgrPools.reduce((s, p) => s + p.totalAum, 0),
          ryvonxCapital: mgrPools.reduce((s, p) => s + p.ryvonxCapital, 0),
          activeInvestors: mgrPools.reduce((s, p) => s + p.activeInvestors, 0),
          poolsManaged: mgrPools.length,
          isRyvonxBacked: mgrPools.some((p) => p.isRyvonxBacked),
        };
      })
      .sort((a, b) => b.totalAum - a.totalAum)
      .slice(0, 20);

    const allocatedCapital = pools.reduce((s, p) => s + p.ryvonxCapital, 0);
    const metrics: CapitalMetrics = {
      availableCapital: settings.totalAvailableCapital - allocatedCapital,
      allocatedCapital,
      utilizationPct: pct(allocatedCapital, settings.totalAvailableCapital),
      activeAllocationCount: activeAllocations.length,
      pendingReviewCount: pendingReviews.length,
      backedPoolCount: pools.filter((p) => p.isRyvonxBacked).length,
      totalCombinedAum: pools.reduce((s, p) => s + p.totalAum, 0),
    };

    return {
      settings: { ...settings, totalAllocatedCapital: allocatedCapital },
      metrics,
      activeAllocations,
      pendingReviews,
      candidates,
      managerRankings,
      recentHistory,
    };
  },

  async getPoolBreakdown(fundId: string): Promise<PoolCapitalBreakdown> {
    const db = createAdminClient();
    const { data } = await db.from("funds").select("*").eq("id", fundId).single();
    if (!data) throw new Error("Pool not found.");
    const row = data as Record<string, unknown>;
    const investor = toNumber(row.investor_capital as number);
    const ryvonx = toNumber(row.ryvonx_capital as number);
    const total = investor + ryvonx;
    return {
      investorCapital: investor,
      ryvonxCapital: ryvonx,
      totalAum: total,
      investorPct: pct(investor, total),
      ryvonxPct: pct(ryvonx, total),
      growthRatePct: row.growth_rate_pct != null ? toNumber(row.growth_rate_pct as number) : null,
      activeInvestors: toNumber(row.active_investors as number),
      capacityStatus: (row.capacity_status as string) ?? "open",
      allocationStatus: (row.allocation_status as string) ?? "none",
      isRyvonxBacked: Boolean(row.is_ryvonx_backed),
      allocationReviewAt: (row.allocation_review_at as string | null) ?? null,
    };
  },

  async markCandidate(fundId: string, notes?: string): Promise<void> {
    const actorId = await getActorId();
    const db = createAdminClient();

    const { data: fund } = await db
      .from("funds")
      .select("name, pool_manager_id, ryvonx_capital")
      .eq("id", fundId)
      .single();
    if (!fund) throw new Error("Pool not found.");
    const fundRow = fund as { name: string; pool_manager_id: string | null; ryvonx_capital: number };

    await db
      .from("funds")
      .update({ allocation_status: ALLOCATION_STATUS.CANDIDATE } as never)
      .eq("id", fundId);

    await db.from("pool_capital_allocations").insert({
      fund_id: fundId,
      pool_manager_id: fundRow.pool_manager_id,
      action: "candidate",
      amount: 0,
      previous_amount: toNumber(fundRow.ryvonx_capital),
      status: "pending",
      committee_label: CAPITAL_COMMITTEE_LABELS.investmentCommittee,
      review_notes: notes ?? null,
      decided_by: actorId,
      decided_at: new Date().toISOString(),
    } as never);

    await auditService.log({
      actorId,
      action: "capital_allocation_candidate",
      entityType: "fund",
      entityId: fundId,
      newValues: { allocation_status: "candidate" },
    });

    await notifyManager(fundRow.pool_manager_id, {
      type: "capital_review_scheduled",
      title: "Capital allocation review scheduled",
      message: `"${fundRow.name}" has been nominated for RyvonX Capital Committee review.`,
      metadata: { fund_id: fundId },
    });
  },

  async allocateCapital(input: {
    fundId: string;
    amount: number;
    reviewNotes?: string;
    nextReviewAt?: string;
    grantBackedBadge?: boolean;
  }): Promise<void> {
    const actorId = await getActorId();
    const db = createAdminClient();

    const { data: fund } = await db.from("funds").select("*").eq("id", input.fundId).single();
    if (!fund) throw new Error("Pool not found.");
    const fundRow = fund as Record<string, unknown>;
    const previousRyvonx = toNumber(fundRow.ryvonx_capital as number);
    const investor = toNumber(fundRow.investor_capital as number);
    const poolManagerId = (fundRow.pool_manager_id as string | null) ?? null;
    const isIncrease = previousRyvonx > 0 && input.amount > previousRyvonx;
    const isReduce = input.amount < previousRyvonx;

    const settings = await poolCapitalAllocationService.getSettings();
    const newAllocated = settings.totalAllocatedCapital - previousRyvonx + input.amount;
    if (newAllocated > settings.totalAvailableCapital) {
      throw new Error("Insufficient RyvonX capital available.");
    }

    const fundUpdates: Record<string, unknown> = {
      ryvonx_capital: input.amount,
      allocation_status: input.amount > 0 ? ALLOCATION_STATUS.ACTIVE : ALLOCATION_STATUS.REMOVED,
      allocation_review_at: input.nextReviewAt ?? null,
    };
    if (input.grantBackedBadge && input.amount > 0) {
      fundUpdates.is_ryvonx_backed = true;
      fundUpdates.ryvonx_backed_at = new Date().toISOString();
      fundUpdates.ryvonx_backed_by = actorId;
    }

    await db.from("funds").update(fundUpdates as never).eq("id", input.fundId);
    await syncFundAum(input.fundId);

    await db.from("pool_capital_allocations").insert({
      fund_id: input.fundId,
      pool_manager_id: poolManagerId,
      action: previousRyvonx === 0 ? "allocate" : isIncrease ? "increase" : isReduce ? "reduce" : "maintain",
      amount: input.amount,
      previous_amount: previousRyvonx,
      status: input.amount > 0 ? "active" : "removed",
      committee_label: CAPITAL_COMMITTEE_LABELS.capitalCommittee,
      review_notes: input.reviewNotes ?? null,
      next_review_at: input.nextReviewAt ?? null,
      decided_by: actorId,
      decided_at: new Date().toISOString(),
    } as never);

    await db
      .from("ryvonx_capital_settings")
      .update({ total_allocated_capital: newAllocated, updated_by: actorId } as never)
      .eq("id", SETTINGS_ID);

    await auditService.log({
      actorId,
      action: "capital_allocated",
      entityType: "fund",
      entityId: input.fundId,
      oldValues: { ryvonx_capital: previousRyvonx },
      newValues: { ryvonx_capital: input.amount, investor_capital: investor },
    });

    const notifType =
      previousRyvonx === 0
        ? "capital_allocation_approved"
        : isIncrease
          ? "capital_allocation_increased"
          : isReduce
            ? "capital_allocation_reduced"
            : "capital_allocation_approved";

    await notifyManager(poolManagerId, {
      type: notifType,
      title: "RyvonX capital allocation updated",
      message: `The RyvonX Capital Committee has allocated $${input.amount.toLocaleString()} to "${fundRow.name as string}". Investor capital is unaffected.`,
      metadata: { fund_id: input.fundId, amount: input.amount },
    });
  },

  async pauseAllocation(fundId: string, notes?: string): Promise<void> {
    const actorId = await getActorId();
    const db = createAdminClient();

    const { data: fund } = await db
      .from("funds")
      .select("name, pool_manager_id, ryvonx_capital")
      .eq("id", fundId)
      .single();
    if (!fund) throw new Error("Pool not found.");
    const fundRow = fund as { name: string; pool_manager_id: string | null; ryvonx_capital: number };

    await db
      .from("funds")
      .update({ allocation_status: ALLOCATION_STATUS.PAUSED } as never)
      .eq("id", fundId);

    await db.from("pool_capital_allocations").insert({
      fund_id: fundId,
      pool_manager_id: fundRow.pool_manager_id,
      action: "pause",
      amount: toNumber(fundRow.ryvonx_capital),
      status: "paused",
      committee_label: CAPITAL_COMMITTEE_LABELS.capitalCommittee,
      review_notes: notes ?? null,
      decided_by: actorId,
      decided_at: new Date().toISOString(),
    } as never);

    await notifyManager(fundRow.pool_manager_id, {
      type: "capital_allocation_reduced",
      title: "Capital allocation paused",
      message: `RyvonX capital allocation for "${fundRow.name}" has been paused. Investor funds are unaffected.`,
    });
  },

  async removeAllocation(fundId: string, notes?: string): Promise<void> {
    await poolCapitalAllocationService.allocateCapital({
      fundId,
      amount: 0,
      reviewNotes: notes,
      grantBackedBadge: false,
    });

    const actorId = await getActorId();
    const db = createAdminClient();
    await db
      .from("funds")
      .update({
        is_ryvonx_backed: false,
        allocation_status: ALLOCATION_STATUS.REMOVED,
      } as never)
      .eq("id", fundId);

    const { data: fund } = await db
      .from("funds")
      .select("name, pool_manager_id")
      .eq("id", fundId)
      .single();
    const fundRow = fund as { name: string; pool_manager_id: string | null };

    await notifyManager(fundRow.pool_manager_id, {
      type: "capital_allocation_removed",
      title: "Capital allocation removed",
      message: `RyvonX capital has been removed from "${fundRow.name}". Investor investments continue normally.`,
    });

    await auditService.log({
      actorId,
      action: "capital_allocation_removed",
      entityType: "fund",
      entityId: fundId,
    });
  },

  async setRyvonxBacked(fundId: string, backed: boolean): Promise<void> {
    const actorId = await getActorId();
    const db = createAdminClient();
    await db
      .from("funds")
      .update({
        is_ryvonx_backed: backed,
        ryvonx_backed_at: backed ? new Date().toISOString() : null,
        ryvonx_backed_by: backed ? actorId : null,
      } as never)
      .eq("id", fundId);

    await auditService.log({
      actorId,
      action: backed ? "ryvonx_backed_badge_awarded" : "ryvonx_backed_badge_removed",
      entityType: "fund",
      entityId: fundId,
    });
  },

  /** Called from governance when pool health degrades */
  async flagAllocationForReview(fundId: string, reason: string): Promise<void> {
    const db = createAdminClient();
    const { data: fund } = await db
      .from("funds")
      .select("allocation_status, ryvonx_capital")
      .eq("id", fundId)
      .maybeSingle();
    if (!fund) return;
    const row = fund as { allocation_status: string; ryvonx_capital: number };
    if (toNumber(row.ryvonx_capital) <= 0 && row.allocation_status === "none") return;

    await db
      .from("funds")
      .update({
        allocation_status: ALLOCATION_STATUS.UNDER_REVIEW,
        allocation_review_at: new Date().toISOString(),
      } as never)
      .eq("id", fundId);

    await db.from("pool_capital_allocations").insert({
      fund_id: fundId,
      action: "review",
      amount: toNumber(row.ryvonx_capital),
      status: "pending",
      committee_label: CAPITAL_COMMITTEE_LABELS.governanceCommittee,
      review_notes: reason,
    } as never);
  },

  async exportReport(reportType: string): Promise<string> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const label = CAPITAL_REPORT_LABELS[reportType] ?? reportType;

    if (reportType === "capital_allocations" || reportType === "historical_allocations") {
      const { data } = await db
        .from("pool_capital_allocations")
        .select("*")
        .order("created_at", { ascending: false });
      const header = "Fund ID,Action,Amount,Previous,Status,Committee,Date\n";
      const body = (data ?? [])
        .map((r) => {
          const row = r as Record<string, unknown>;
          return [
            row.fund_id,
            row.action,
            row.amount,
            row.previous_amount,
            row.status,
            `"${row.committee_label ?? ""}"`,
            row.created_at,
          ].join(",");
        })
        .join("\n");
      return `# ${label}\n${header}${body}`;
    }

    if (reportType === "pool_growth") {
      const { data } = await db
        .from("funds")
        .select("id, name, investor_capital, ryvonx_capital, active_investors, growth_rate_pct, allocation_status");
      const header = "Pool ID,Name,Investor Capital,RyvonX Capital,Investors,Growth %,Status\n";
      const body = (data ?? [])
        .map((r) => {
          const row = r as Record<string, unknown>;
          return [
            row.id,
            `"${row.name}"`,
            row.investor_capital,
            row.ryvonx_capital,
            row.active_investors,
            row.growth_rate_pct,
            row.allocation_status,
          ].join(",");
        })
        .join("\n");
      return `# ${label}\n${header}${body}`;
    }

    return `# ${label}\nNo data exported for this report type yet.\n`;
  },
};
