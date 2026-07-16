import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import {
  COMMITTEE_LABELS,
  GOVERNANCE_REPORT_LABELS,
} from "@/constants/governance";
import type {
  GovernanceDashboardSummary,
  GovernancePoolSummary,
  GovernanceReview,
  GovernanceRule,
  GovernanceScore,
  GovernanceTimelineEntry,
  GovernanceUpcomingReview,
  GovernanceViolation,
  GovernanceWarning,
  PoolGovernanceDetail,
  PoolMonitoringMetrics,
} from "@/domain/governance/types";
import { auditService } from "@/services/audit.service";
import { notificationService } from "@/services/notification.service";
import { buildProtectionIndicators as buildIndicators } from "@/lib/governance/protection-indicators";

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

type FundRow = Record<string, unknown>;

function mapPoolSummary(row: FundRow, managerName: string | null): GovernancePoolSummary {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    poolHealth: (row.pool_health as string) ?? "healthy",
    governanceStage: (row.governance_stage as string) ?? "active",
    managerName,
    managerId: (row.pool_manager_id as string | null) ?? null,
    activeInvestors: toNumber(row.active_investors as number),
    assetsUnderManagement: toNumber(row.assets_under_management as number),
    onProbation: Boolean(row.on_probation),
    underGovernanceReview: Boolean(row.under_governance_review),
    nextReviewAt: (row.next_review_at as string | null) ?? null,
  };
}

function buildProtectionIndicators(row: FundRow): string[] {
  return buildIndicators({
    governance_verified: Boolean(row.governance_verified),
    governance_approved: Boolean(row.governance_approved),
    under_governance_review: Boolean(row.under_governance_review),
    on_probation: Boolean(row.on_probation),
    pool_health: row.pool_health as string,
    governance_stage: row.governance_stage as string,
  });
}

function healthForStage(stage: string): string {
  const map: Record<string, string> = {
    performance_monitoring: "watchlist",
    warning: "warning",
    probation: "warning",
    restricted: "restricted",
    suspended: "suspended",
    active: "healthy",
    approved: "healthy",
    review: "watchlist",
  };
  return map[stage] ?? "healthy";
}

async function getActorId(): Promise<string> {
  const user = await requireRole(USER_ROLES.ADMINISTRATOR);
  return user.id;
}

async function getInvestorUserIds(fundId: string): Promise<string[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("investor_portfolios")
    .select("user_id")
    .eq("fund_id", fundId)
    .gt("total_invested", 0);
  return [...new Set((data ?? []).map((r) => (r as { user_id: string }).user_id))];
}

async function notifyPoolInvestors(input: {
  fundId: string;
  poolName: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const userIds = await getInvestorUserIds(input.fundId);
  await Promise.all(
    userIds.map((userId) =>
      notificationService.sendToUser({
        userId,
        type: input.type,
        title: input.title,
        message: input.message,
        metadata: { pool_id: input.fundId, ...input.metadata },
      })
    )
  );
}

async function appendTimeline(input: {
  fundId?: string | null;
  poolManagerId?: string | null;
  eventType: string;
  title: string;
  description?: string | null;
  previousStage?: string | null;
  newStage?: string | null;
  actorId?: string | null;
  committeeLabel?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const db = createAdminClient();
  await db.from("pool_governance_timeline").insert({
    fund_id: input.fundId ?? null,
    pool_manager_id: input.poolManagerId ?? null,
    event_type: input.eventType,
    title: input.title,
    description: input.description ?? null,
    previous_stage: input.previousStage ?? null,
    new_stage: input.newStage ?? null,
    actor_id: input.actorId ?? null,
    committee_label: input.committeeLabel ?? null,
    metadata: input.metadata ?? {},
  } as never);
}

async function maybeFlagCapitalReview(fundId: string, reason: string): Promise<void> {
  try {
    const { poolCapitalAllocationService } = await import(
      "@/services/pool-capital-allocation.service"
    );
    await poolCapitalAllocationService.flagAllocationForReview(fundId, reason);
  } catch {
    /* non-blocking if capital tables not yet migrated */
  }
}

export const poolGovernanceService = {
  async getDashboard(): Promise<GovernanceDashboardSummary> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const { data: funds } = await db
      .from("funds")
      .select(
        "id, name, slug, pool_health, governance_stage, pool_manager_id, active_investors, assets_under_management, on_probation, under_governance_review, next_review_at, pool_manager_name"
      )
      .neq("status", "archived");

    const managerIds = [
      ...new Set(
        (funds ?? [])
          .map((f) => (f as FundRow).pool_manager_id as string | null)
          .filter(Boolean) as string[]
      ),
    ];
    const managerMap = new Map<string, string>();
    if (managerIds.length > 0) {
      const { data: managers } = await db
        .from("pool_managers")
        .select("id, display_name")
        .in("id", managerIds);
      for (const m of managers ?? []) {
        managerMap.set(
          (m as { id: string }).id,
          (m as { display_name: string }).display_name
        );
      }
    }

    const pools = (funds ?? []).map((f) => {
      const row = f as FundRow;
      const mgrId = row.pool_manager_id as string | null;
      const mgrName =
        (row.pool_manager_name as string | null) ??
        (mgrId ? managerMap.get(mgrId) ?? null : null);
      return mapPoolSummary(row, mgrName);
    });

    const { data: violations } = await db
      .from("pool_governance_violations")
      .select("*")
      .order("violation_at", { ascending: false })
      .limit(20);

    const fundNameMap = new Map(pools.map((p) => [p.id, p.name]));
    const recentViolations = await poolGovernanceService.mapViolations(
      (violations ?? []) as Record<string, unknown>[],
      fundNameMap
    );

    const { data: timeline } = await db
      .from("pool_governance_timeline")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15);

    const recentActions = await poolGovernanceService.mapTimeline(
      (timeline ?? []) as Record<string, unknown>[],
      fundNameMap
    );

    const now = new Date();
    const upcomingReviews: GovernanceUpcomingReview[] = pools
      .filter((p) => p.nextReviewAt && new Date(p.nextReviewAt) >= now)
      .sort(
        (a, b) =>
          new Date(a.nextReviewAt!).getTime() - new Date(b.nextReviewAt!).getTime()
      )
      .slice(0, 10)
      .map((p) => ({
        fundId: p.id,
        fundName: p.name,
        nextReviewAt: p.nextReviewAt!,
        reviewFrequency: null,
      }));

    const openViolationCount = recentViolations.filter((v) => v.status === "open").length;

    return {
      underReview: pools.filter((p) => p.underGovernanceReview || p.governanceStage === "review"),
      watchlist: pools.filter((p) => p.poolHealth === "watchlist"),
      healthy: pools.filter((p) => p.poolHealth === "healthy" && !p.onProbation),
      warning: pools.filter((p) => p.poolHealth === "warning" || p.governanceStage === "warning"),
      probation: pools.filter((p) => p.onProbation || p.governanceStage === "probation"),
      restricted: pools.filter((p) => p.poolHealth === "restricted" || p.governanceStage === "restricted"),
      suspended: pools.filter((p) => p.poolHealth === "suspended" || p.governanceStage === "suspended"),
      recentActions,
      recentViolations,
      upcomingReviews,
      metrics: {
        totalActivePools: pools.filter((p) => p.governanceStage !== "removed").length,
        poolsUnderReview: pools.filter((p) => p.underGovernanceReview).length,
        openViolations: openViolationCount,
        poolsOnProbation: pools.filter((p) => p.onProbation).length,
        suspendedPools: pools.filter((p) => p.poolHealth === "suspended").length,
        healthyPools: pools.filter((p) => p.poolHealth === "healthy").length,
      },
    };
  },

  async listViolations(limit = 100): Promise<GovernanceViolation[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const { data } = await db
      .from("pool_governance_violations")
      .select("*")
      .order("violation_at", { ascending: false })
      .limit(limit);

    const fundIds = [...new Set((data ?? []).map((r) => (r as { fund_id: string }).fund_id))];
    const fundNameMap = new Map<string, string>();
    if (fundIds.length > 0) {
      const { data: funds } = await db.from("funds").select("id, name").in("id", fundIds);
      for (const f of funds ?? []) {
        fundNameMap.set((f as { id: string }).id, (f as { name: string }).name);
      }
    }

    return poolGovernanceService.mapViolations(
      (data ?? []) as Record<string, unknown>[],
      fundNameMap
    );
  },

  async mapViolations(
    rows: Record<string, unknown>[],
    fundNameMap: Map<string, string>
  ): Promise<GovernanceViolation[]> {
    return rows.map((row) => ({
      id: row.id as string,
      fundId: row.fund_id as string,
      fundName: fundNameMap.get(row.fund_id as string) ?? "Unknown Pool",
      poolManagerId: (row.pool_manager_id as string | null) ?? null,
      managerName: null,
      ruleKey: row.rule_key as string,
      ruleName: row.rule_name as string,
      actualValue: row.actual_value != null ? toNumber(row.actual_value as number) : null,
      expectedValue: row.expected_value != null ? toNumber(row.expected_value as number) : null,
      violationAt: row.violation_at as string,
      severity: row.severity as string,
      status: row.status as string,
      adminNotes: (row.admin_notes as string | null) ?? null,
    }));
  },

  async mapTimeline(
    rows: Record<string, unknown>[],
    fundNameMap: Map<string, string>
  ): Promise<GovernanceTimelineEntry[]> {
    return rows.map((row) => ({
      id: row.id as string,
      fundId: (row.fund_id as string | null) ?? null,
      fundName: row.fund_id ? fundNameMap.get(row.fund_id as string) ?? null : null,
      poolManagerId: (row.pool_manager_id as string | null) ?? null,
      eventType: row.event_type as string,
      title: row.title as string,
      description: (row.description as string | null) ?? null,
      previousStage: (row.previous_stage as string | null) ?? null,
      newStage: (row.new_stage as string | null) ?? null,
      committeeLabel: (row.committee_label as string | null) ?? null,
      actorName: null,
      createdAt: row.created_at as string,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
    }));
  },

  async listRules(fundId?: string | null): Promise<GovernanceRule[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    let query = db.from("pool_governance_rules").select("*").order("rule_name");
    if (fundId === null) query = query.is("fund_id", null);
    else if (fundId) query = query.or(`fund_id.eq.${fundId},fund_id.is.null`);

    const { data } = await query;
    const fundIds = [
      ...new Set(
        (data ?? [])
          .map((r) => (r as { fund_id: string | null }).fund_id)
          .filter(Boolean) as string[]
      ),
    ];
    const fundMap = new Map<string, string>();
    if (fundIds.length > 0) {
      const { data: funds } = await db.from("funds").select("id, name").in("id", fundIds);
      for (const f of funds ?? []) {
        fundMap.set((f as { id: string }).id, (f as { name: string }).name);
      }
    }

    return (data ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      const fid = (r.fund_id as string | null) ?? null;
      return {
        id: r.id as string,
        fundId: fid,
        fundName: fid ? fundMap.get(fid) ?? null : null,
        ruleKey: r.rule_key as string,
        ruleName: r.rule_name as string,
        description: (r.description as string | null) ?? null,
        ruleType: r.rule_type as string,
        thresholdValue: r.threshold_value != null ? toNumber(r.threshold_value as number) : null,
        thresholdUnit: (r.threshold_unit as string | null) ?? null,
        defaultSeverity: r.default_severity as string,
        isActive: Boolean(r.is_active),
        createdAt: r.created_at as string,
      };
    });
  },

  async upsertRule(input: {
    id?: string;
    fundId?: string | null;
    ruleKey: string;
    ruleName: string;
    description?: string;
    ruleType: string;
    thresholdValue?: number | null;
    thresholdUnit?: string | null;
    defaultSeverity?: string;
    isActive?: boolean;
  }): Promise<void> {
    const actorId = await getActorId();
    const db = createAdminClient();

    const payload = {
      fund_id: input.fundId ?? null,
      rule_key: input.ruleKey,
      rule_name: input.ruleName,
      description: input.description ?? null,
      rule_type: input.ruleType,
      threshold_value: input.thresholdValue ?? null,
      threshold_unit: input.thresholdUnit ?? null,
      default_severity: input.defaultSeverity ?? "minor",
      is_active: input.isActive ?? true,
      created_by: actorId,
    };

    if (input.id) {
      await db.from("pool_governance_rules").update(payload as never).eq("id", input.id);
    } else {
      await db.from("pool_governance_rules").insert(payload as never);
    }

    await auditService.log({
      actorId,
      action: input.id ? "governance_rule_updated" : "governance_rule_created",
      entityType: "pool_governance_rule",
      entityId: input.id ?? input.ruleKey,
      newValues: payload,
    });
  },

  async recordViolation(input: {
    fundId: string;
    ruleId?: string;
    ruleKey: string;
    ruleName: string;
    actualValue?: number | null;
    expectedValue?: number | null;
    severity?: string;
    adminNotes?: string;
  }): Promise<string> {
    const actorId = await getActorId();
    const db = createAdminClient();

    const { data: fund } = await db
      .from("funds")
      .select("name, pool_manager_id")
      .eq("id", input.fundId)
      .single();

    if (!fund) throw new Error("Pool not found.");
    const fundRow = fund as { name: string; pool_manager_id: string | null };

    const { data: inserted, error } = await db
      .from("pool_governance_violations")
      .insert({
        fund_id: input.fundId,
        pool_manager_id: fundRow.pool_manager_id,
        rule_id: input.ruleId ?? null,
        rule_key: input.ruleKey,
        rule_name: input.ruleName,
        actual_value: input.actualValue ?? null,
        expected_value: input.expectedValue ?? null,
        severity: input.severity ?? "minor",
        admin_notes: input.adminNotes ?? null,
      } as never)
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    const violationId = (inserted as { id: string }).id;

    await appendTimeline({
      fundId: input.fundId,
      poolManagerId: fundRow.pool_manager_id,
      eventType: "rule_violation",
      title: `Rule violation: ${input.ruleName}`,
      description: input.adminNotes ?? `Actual: ${input.actualValue}, Expected: ${input.expectedValue}`,
      actorId,
      committeeLabel: COMMITTEE_LABELS.governanceTeam,
      metadata: { violation_id: violationId, rule_key: input.ruleKey },
    });

    await auditService.log({
      actorId,
      action: "governance_violation_recorded",
      entityType: "pool_governance_violation",
      entityId: violationId,
      newValues: input as unknown as Record<string, unknown>,
    });

    await notifyPoolInvestors({
      fundId: input.fundId,
      poolName: fundRow.name,
      type: "pool_governance_violation",
      title: "Governance rule violation",
      message: `"${fundRow.name}" recorded a governance violation (${input.ruleName}). RyvonX is monitoring the situation.`,
    });

    return violationId;
  },

  async updateViolationStatus(input: {
    violationId: string;
    status: string;
    adminNotes?: string;
  }): Promise<void> {
    const actorId = await getActorId();
    const db = createAdminClient();

    await db
      .from("pool_governance_violations")
      .update({
        status: input.status,
        admin_notes: input.adminNotes ?? null,
        resolved_at: ["resolved", "dismissed"].includes(input.status)
          ? new Date().toISOString()
          : null,
        resolved_by: actorId,
      } as never)
      .eq("id", input.violationId);

    await auditService.log({
      actorId,
      action: "governance_violation_status_updated",
      entityType: "pool_governance_violation",
      entityId: input.violationId,
      newValues: { status: input.status },
    });
  },

  async issueWarning(input: {
    fundId: string;
    level: string;
    title: string;
    description?: string;
    reason?: string;
    adminNotes?: string;
    requiredAction?: string;
    responseDeadline?: string | null;
  }): Promise<void> {
    const actorId = await getActorId();
    const db = createAdminClient();

    const { data: fund } = await db
      .from("funds")
      .select("name, pool_manager_id, governance_stage, pool_health")
      .eq("id", input.fundId)
      .single();

    if (!fund) throw new Error("Pool not found.");
    const fundRow = fund as {
      name: string;
      pool_manager_id: string | null;
      governance_stage: string;
      pool_health: string;
    };

    await db.from("pool_governance_warnings").insert({
      fund_id: input.fundId,
      pool_manager_id: fundRow.pool_manager_id,
      level: input.level,
      title: input.title,
      description: input.description ?? null,
      reason: input.reason ?? null,
      admin_notes: input.adminNotes ?? null,
      required_action: input.requiredAction ?? null,
      response_deadline: input.responseDeadline ?? null,
      issued_by: actorId,
    } as never);

    const newHealth = input.level === "critical" ? "warning" : fundRow.pool_health;
    await db
      .from("funds")
      .update({
        pool_health: newHealth,
        governance_stage: "warning",
      } as never)
      .eq("id", input.fundId);

    if (fundRow.pool_manager_id) {
      await db
        .from("pool_managers")
        .update({ governance_stage: "warning" } as never)
        .eq("id", fundRow.pool_manager_id);
    }

    await appendTimeline({
      fundId: input.fundId,
      poolManagerId: fundRow.pool_manager_id,
      eventType: "warning_issued",
      title: input.title,
      description: input.reason ?? input.description ?? null,
      previousStage: fundRow.governance_stage,
      newStage: "warning",
      actorId,
      committeeLabel: COMMITTEE_LABELS.warningIssued,
    });

    await auditService.log({
      actorId,
      action: "governance_warning_issued",
      entityType: "fund",
      entityId: input.fundId,
      newValues: input as unknown as Record<string, unknown>,
    });

    await notifyPoolInvestors({
      fundId: input.fundId,
      poolName: fundRow.name,
      type: "pool_governance_warning",
      title: input.title,
      message: input.reason ?? input.description ?? `A governance warning was issued for "${fundRow.name}".`,
    });

    if (fundRow.pool_manager_id) {
      const { data: mgr } = await db
        .from("pool_managers")
        .select("user_id")
        .eq("id", fundRow.pool_manager_id)
        .maybeSingle();
      const userId = (mgr as { user_id?: string } | null)?.user_id;
      if (userId) {
        await notificationService.sendToUser({
          userId,
          type: "pool_governance_warning",
          title: input.title,
          message: input.reason ?? input.description ?? "A governance warning was issued.",
          metadata: { pool_id: input.fundId },
        });
      }
    }
  },

  async setGovernanceStage(input: {
    fundId: string;
    stage: string;
    notes?: string;
    committeeLabel?: string;
  }): Promise<void> {
    const actorId = await getActorId();
    const db = createAdminClient();

    const { data: fund } = await db
      .from("funds")
      .select("name, pool_manager_id, governance_stage, pool_health")
      .eq("id", input.fundId)
      .single();

    if (!fund) throw new Error("Pool not found.");
    const fundRow = fund as {
      name: string;
      pool_manager_id: string | null;
      governance_stage: string;
      pool_health: string;
    };

    const poolHealth = healthForStage(input.stage);
    const updates: Record<string, unknown> = {
      governance_stage: input.stage,
      pool_health: poolHealth,
      under_governance_review: input.stage === "review",
      on_probation: input.stage === "probation",
    };

    if (input.stage === "suspended") {
      updates.hide_from_marketplace = true;
      updates.pause_new_investments = true;
      updates.suspended_at = new Date().toISOString();
      updates.suspended_by = actorId;
      updates.lifecycle_status = "paused";
      updates.status = "paused";
    }

    if (input.stage === "active" || input.stage === "approved") {
      updates.on_probation = false;
      updates.probation_ends_at = null;
      updates.under_governance_review = false;
    }

    await db.from("funds").update(updates as never).eq("id", input.fundId);

    if (fundRow.pool_manager_id) {
      await db
        .from("pool_managers")
        .update({ governance_stage: input.stage } as never)
        .eq("id", fundRow.pool_manager_id);
    }

    await appendTimeline({
      fundId: input.fundId,
      poolManagerId: fundRow.pool_manager_id,
      eventType: "stage_transition",
      title: `Governance stage: ${input.stage}`,
      description: input.notes ?? null,
      previousStage: fundRow.governance_stage,
      newStage: input.stage,
      actorId,
      committeeLabel: input.committeeLabel ?? COMMITTEE_LABELS.governanceReview,
    });

    await auditService.log({
      actorId,
      action: "governance_stage_changed",
      entityType: "fund",
      entityId: input.fundId,
      oldValues: { governance_stage: fundRow.governance_stage },
      newValues: { governance_stage: input.stage, pool_health: poolHealth },
    });

    if (["warning", "probation", "restricted", "suspended"].includes(input.stage)) {
      await maybeFlagCapitalReview(
        input.fundId,
        `Governance stage changed to ${input.stage}. Capital allocation eligible for committee review.`
      );
    }
  },

  async setRestrictions(input: {
    fundId: string;
    pauseNewInvestments?: boolean;
    pauseWithdrawals?: boolean;
    freezeMarketing?: boolean;
    hideFromMarketplace?: boolean;
    requireAdditionalReview?: boolean;
    tradingSuspended?: boolean;
    notes?: string;
  }): Promise<void> {
    const actorId = await getActorId();
    const db = createAdminClient();

    const { data: fund } = await db
      .from("funds")
      .select("name, pool_manager_id, pool_health")
      .eq("id", input.fundId)
      .single();

    if (!fund) throw new Error("Pool not found.");
    const fundRow = fund as { name: string; pool_manager_id: string | null; pool_health: string };

    const updates: Record<string, unknown> = {};
    if (input.pauseNewInvestments != null) updates.pause_new_investments = input.pauseNewInvestments;
    if (input.pauseWithdrawals != null) updates.pause_withdrawals = input.pauseWithdrawals;
    if (input.freezeMarketing != null) updates.freeze_marketing = input.freezeMarketing;
    if (input.hideFromMarketplace != null) {
      updates.hide_from_marketplace = input.hideFromMarketplace;
      if (input.hideFromMarketplace) updates.is_marketplace_listed = false;
    }
    if (input.requireAdditionalReview != null)
      updates.require_additional_review = input.requireAdditionalReview;
    if (input.tradingSuspended != null) updates.trading_suspended = input.tradingSuspended;

    const hasRestriction = Object.values({
      pauseNewInvestments: input.pauseNewInvestments,
      pauseWithdrawals: input.pauseWithdrawals,
      freezeMarketing: input.freezeMarketing,
      hideFromMarketplace: input.hideFromMarketplace,
      tradingSuspended: input.tradingSuspended,
    }).some(Boolean);

    if (hasRestriction) {
      updates.pool_health = "restricted";
      updates.governance_stage = "restricted";
    }

    await db.from("funds").update(updates as never).eq("id", input.fundId);

    await appendTimeline({
      fundId: input.fundId,
      poolManagerId: fundRow.pool_manager_id,
      eventType: "restrictions_applied",
      title: "Pool restrictions updated",
      description: input.notes ?? null,
      actorId,
      committeeLabel: COMMITTEE_LABELS.riskApproval,
      metadata: updates,
    });

    await auditService.log({
      actorId,
      action: "governance_restrictions_updated",
      entityType: "fund",
      entityId: input.fundId,
      newValues: updates,
    });

    await notifyPoolInvestors({
      fundId: input.fundId,
      poolName: fundRow.name,
      type: "pool_governance_restricted",
      title: "Pool restrictions applied",
      message: `"${fundRow.name}" has new governance restrictions. Review your pool dashboard for details.`,
    });
  },

  async suspendPool(input: {
    fundId: string;
    reason: string;
    notes?: string;
  }): Promise<void> {
    const actorId = await getActorId();
    const db = createAdminClient();

    const { data: fund } = await db
      .from("funds")
      .select("name, pool_manager_id")
      .eq("id", input.fundId)
      .single();

    if (!fund) throw new Error("Pool not found.");
    const fundRow = fund as { name: string; pool_manager_id: string | null };

    await db
      .from("funds")
      .update({
        governance_stage: "suspended",
        pool_health: "suspended",
        lifecycle_status: "paused",
        status: "paused",
        is_marketplace_listed: false,
        hide_from_marketplace: true,
        pause_new_investments: true,
        suspension_reason: input.reason,
        suspension_notes: input.notes ?? null,
        suspended_at: new Date().toISOString(),
        suspended_by: actorId,
      } as never)
      .eq("id", input.fundId);

    if (fundRow.pool_manager_id) {
      await db
        .from("pool_managers")
        .update({ governance_stage: "suspended", status: "suspended" } as never)
        .eq("id", fundRow.pool_manager_id);
    }

    await appendTimeline({
      fundId: input.fundId,
      poolManagerId: fundRow.pool_manager_id,
      eventType: "pool_suspended",
      title: "Pool suspended by RyvonX",
      description: input.reason,
      newStage: "suspended",
      actorId,
      committeeLabel: COMMITTEE_LABELS.suspension,
    });

    await auditService.log({
      actorId,
      action: "pool_suspended",
      entityType: "fund",
      entityId: input.fundId,
      newValues: { reason: input.reason, notes: input.notes },
    });

    await notifyPoolInvestors({
      fundId: input.fundId,
      poolName: fundRow.name,
      type: "pool_governance_suspended",
      title: "Pool suspended by RyvonX",
      message: `"${fundRow.name}" has been suspended. Reason: ${input.reason}. Existing investments remain visible; new deposits are paused.`,
    });

    await maybeFlagCapitalReview(
      input.fundId,
      `Pool suspended: ${input.reason}. RyvonX capital allocation requires committee review.`
    );
  },

  async reactivatePool(input: { fundId: string; notes?: string }): Promise<void> {
    const actorId = await getActorId();
    const db = createAdminClient();

    const { data: fund } = await db
      .from("funds")
      .select("name, pool_manager_id")
      .eq("id", input.fundId)
      .single();

    if (!fund) throw new Error("Pool not found.");
    const fundRow = fund as { name: string; pool_manager_id: string | null };

    await db
      .from("funds")
      .update({
        governance_stage: "active",
        pool_health: "healthy",
        lifecycle_status: "live",
        status: "active",
        hide_from_marketplace: false,
        pause_new_investments: false,
        trading_suspended: false,
        on_probation: false,
        suspension_reason: null,
        suspension_notes: null,
        suspended_at: null,
        suspended_by: null,
      } as never)
      .eq("id", input.fundId);

    if (fundRow.pool_manager_id) {
      await db
        .from("pool_managers")
        .update({ governance_stage: "active", status: "approved" } as never)
        .eq("id", fundRow.pool_manager_id);
    }

    await appendTimeline({
      fundId: input.fundId,
      poolManagerId: fundRow.pool_manager_id,
      eventType: "pool_reactivated",
      title: "Pool reactivated",
      description: input.notes ?? null,
      newStage: "active",
      actorId,
      committeeLabel: COMMITTEE_LABELS.reactivation,
    });

    await notifyPoolInvestors({
      fundId: input.fundId,
      poolName: fundRow.name,
      type: "pool_governance_reactivated",
      title: "Pool returned to healthy status",
      message: `"${fundRow.name}" has been reactivated by the RyvonX Investment Committee.`,
    });
  },

  async startProbation(input: {
    fundId: string;
    endsAt: string;
    notes?: string;
    pauseNewInvestments?: boolean;
  }): Promise<void> {
    const actorId = await getActorId();
    const db = createAdminClient();

    const { data: fund } = await db
      .from("funds")
      .select("name, pool_manager_id")
      .eq("id", input.fundId)
      .single();

    if (!fund) throw new Error("Pool not found.");
    const fundRow = fund as { name: string; pool_manager_id: string | null };

    await db
      .from("funds")
      .update({
        on_probation: true,
        governance_stage: "probation",
        pool_health: "warning",
        probation_started_at: new Date().toISOString(),
        probation_ends_at: input.endsAt,
        probation_notes: input.notes ?? null,
        pause_new_investments: input.pauseNewInvestments ?? false,
        review_frequency: "weekly",
      } as never)
      .eq("id", input.fundId);

    if (fundRow.pool_manager_id) {
      await db
        .from("pool_managers")
        .update({ governance_stage: "probation" } as never)
        .eq("id", fundRow.pool_manager_id);
    }

    await appendTimeline({
      fundId: input.fundId,
      poolManagerId: fundRow.pool_manager_id,
      eventType: "probation_started",
      title: "Probation started",
      description: input.notes ?? null,
      newStage: "probation",
      actorId,
      committeeLabel: COMMITTEE_LABELS.governanceTeam,
    });

    await notifyPoolInvestors({
      fundId: input.fundId,
      poolName: fundRow.name,
      type: "pool_governance_probation",
      title: "Pool placed on probation",
      message: `"${fundRow.name}" is under enhanced RyvonX governance review until ${new Date(input.endsAt).toLocaleDateString()}.`,
    });
  },

  async createReview(input: {
    fundId: string;
    reviewType: string;
    reviewDate?: string;
    performanceSummary?: string;
    riskAnalysis?: string;
    ruleCompliance?: string;
    investorGrowthSummary?: string;
    capitalGrowthSummary?: string;
    observations?: string;
    strengths?: string;
    weaknesses?: string;
    requiredImprovements?: string;
    recommendation?: string;
    finalRating?: string;
    visibility?: string;
  }): Promise<void> {
    const actorId = await getActorId();
    const db = createAdminClient();

    const { data: fund } = await db
      .from("funds")
      .select("name, pool_manager_id, review_frequency")
      .eq("id", input.fundId)
      .single();

    if (!fund) throw new Error("Pool not found.");
    const fundRow = fund as {
      name: string;
      pool_manager_id: string | null;
      review_frequency: string | null;
    };

    await db.from("pool_governance_reviews").insert({
      fund_id: input.fundId,
      pool_manager_id: fundRow.pool_manager_id,
      review_type: input.reviewType,
      review_date: input.reviewDate ?? new Date().toISOString().slice(0, 10),
      reviewer_id: actorId,
      performance_summary: input.performanceSummary ?? null,
      risk_analysis: input.riskAnalysis ?? null,
      rule_compliance: input.ruleCompliance ?? null,
      investor_growth_summary: input.investorGrowthSummary ?? null,
      capital_growth_summary: input.capitalGrowthSummary ?? null,
      observations: input.observations ?? null,
      strengths: input.strengths ?? null,
      weaknesses: input.weaknesses ?? null,
      required_improvements: input.requiredImprovements ?? null,
      recommendation: input.recommendation ?? null,
      final_rating: input.finalRating ?? null,
      visibility: input.visibility ?? "internal",
      committee_label: COMMITTEE_LABELS.reviewCompleted,
    } as never);

    const freqDays: Record<string, number> = {
      weekly: 7,
      monthly: 30,
      quarterly: 90,
      annual: 365,
    };
    const freq = fundRow.review_frequency ?? input.reviewType;
    const days = freqDays[freq] ?? 30;
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + days);

    await db
      .from("funds")
      .update({
        under_governance_review: false,
        next_review_at: nextReview.toISOString(),
      } as never)
      .eq("id", input.fundId);

    await appendTimeline({
      fundId: input.fundId,
      poolManagerId: fundRow.pool_manager_id,
      eventType: "governance_review",
      title: `${input.reviewType} governance review completed`,
      description: input.recommendation ?? null,
      actorId,
      committeeLabel: COMMITTEE_LABELS.reviewCompleted,
    });

    if (input.visibility === "investors") {
      await notifyPoolInvestors({
        fundId: input.fundId,
        poolName: fundRow.name,
        type: "pool_governance_review",
        title: "Governance review completed",
        message: `A RyvonX governance review for "${fundRow.name}" has been published.`,
      });
    }
  },

  async upsertScore(input: {
    fundId?: string | null;
    poolManagerId?: string | null;
    category: string;
    score: number;
    notes?: string;
  }): Promise<void> {
    const actorId = await getActorId();
    const db = createAdminClient();

    let existing: { id: string } | null = null;
    if (input.fundId) {
      const { data } = await db
        .from("pool_governance_scores")
        .select("id")
        .eq("fund_id", input.fundId)
        .eq("category", input.category)
        .maybeSingle();
      existing = data as { id: string } | null;
    }

    const payload = {
      fund_id: input.fundId ?? null,
      pool_manager_id: input.poolManagerId ?? null,
      category: input.category,
      score: input.score,
      notes: input.notes ?? null,
      scored_by: actorId,
      scored_at: new Date().toISOString(),
    };

    if (existing) {
      await db
        .from("pool_governance_scores")
        .update(payload as never)
        .eq("id", existing.id);
    } else {
      await db.from("pool_governance_scores").insert(payload as never);
    }

    await auditService.log({
      actorId,
      action: "governance_score_updated",
      entityType: "pool_governance_score",
      entityId: input.fundId ?? input.poolManagerId ?? input.category,
      newValues: payload,
    });
  },

  async getPoolDetail(fundId: string): Promise<PoolGovernanceDetail> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const { data: fund } = await db.from("funds").select("*").eq("id", fundId).single();
    if (!fund) throw new Error("Pool not found.");
    const row = fund as FundRow;

    const managerName = (row.pool_manager_name as string | null) ?? null;
    const summary = mapPoolSummary(row, managerName);

    const [violationsRes, warningsRes, reviewsRes, scoresRes, timelineRes, statsRes] =
      await Promise.all([
        db.from("pool_governance_violations").select("*").eq("fund_id", fundId).order("violation_at", { ascending: false }),
        db.from("pool_governance_warnings").select("*").eq("fund_id", fundId).order("created_at", { ascending: false }),
        db.from("pool_governance_reviews").select("*").eq("fund_id", fundId).order("review_date", { ascending: false }),
        db.from("pool_governance_scores").select("*").eq("fund_id", fundId),
        db.from("pool_governance_timeline").select("*").eq("fund_id", fundId).order("created_at", { ascending: false }),
        db.from("pool_stats").select("monthly_roi, max_drawdown, win_rate").eq("fund_id", fundId).maybeSingle(),
      ]);

    const fundNameMap = new Map([[fundId, summary.name]]);
    const violations = await poolGovernanceService.mapViolations(
      (violationsRes.data ?? []) as Record<string, unknown>[],
      fundNameMap
    );
    const timeline = await poolGovernanceService.mapTimeline(
      (timelineRes.data ?? []) as Record<string, unknown>[],
      fundNameMap
    );

    const warnings: GovernanceWarning[] = (warningsRes.data ?? []).map((w) => {
      const r = w as Record<string, unknown>;
      return {
        id: r.id as string,
        fundId: r.fund_id as string,
        fundName: summary.name,
        poolManagerId: (r.pool_manager_id as string | null) ?? null,
        level: r.level as string,
        title: r.title as string,
        description: (r.description as string | null) ?? null,
        reason: (r.reason as string | null) ?? null,
        adminNotes: (r.admin_notes as string | null) ?? null,
        requiredAction: (r.required_action as string | null) ?? null,
        responseDeadline: (r.response_deadline as string | null) ?? null,
        issuedByName: null,
        createdAt: r.created_at as string,
      };
    });

    const reviews: GovernanceReview[] = (reviewsRes.data ?? []).map((rev) => {
      const r = rev as Record<string, unknown>;
      return {
        id: r.id as string,
        fundId: r.fund_id as string,
        fundName: summary.name,
        poolManagerId: (r.pool_manager_id as string | null) ?? null,
        reviewType: r.review_type as string,
        reviewDate: r.review_date as string,
        reviewerName: null,
        performanceSummary: (r.performance_summary as string | null) ?? null,
        riskAnalysis: (r.risk_analysis as string | null) ?? null,
        ruleCompliance: (r.rule_compliance as string | null) ?? null,
        observations: (r.observations as string | null) ?? null,
        strengths: (r.strengths as string | null) ?? null,
        weaknesses: (r.weaknesses as string | null) ?? null,
        requiredImprovements: (r.required_improvements as string | null) ?? null,
        recommendation: (r.recommendation as string | null) ?? null,
        finalRating: (r.final_rating as string | null) ?? null,
        visibility: r.visibility as string,
        committeeLabel: (r.committee_label as string | null) ?? null,
        createdAt: r.created_at as string,
      };
    });

    const scores: GovernanceScore[] = (scoresRes.data ?? []).map((s) => {
      const r = s as Record<string, unknown>;
      return {
        id: r.id as string,
        fundId: (r.fund_id as string | null) ?? null,
        poolManagerId: (r.pool_manager_id as string | null) ?? null,
        category: r.category as string,
        score: toNumber(r.score as number),
        notes: (r.notes as string | null) ?? null,
        scoredByName: null,
        scoredAt: r.scored_at as string,
      };
    });

    const stats = statsRes.data as {
      monthly_roi?: number;
      max_drawdown?: number;
      win_rate?: number;
    } | null;

    const monitoringMetrics: PoolMonitoringMetrics = {
      poolGrowthPct: null,
      maxDrawdownPct: stats?.max_drawdown != null ? toNumber(stats.max_drawdown) : null,
      monthlyReturnPct: stats?.monthly_roi != null ? toNumber(stats.monthly_roi) : null,
      winRatePct: stats?.win_rate != null ? toNumber(stats.win_rate) : null,
      activeInvestors: summary.activeInvestors,
      assetsUnderManagement: summary.assetsUnderManagement,
      openViolations: violations.filter((v) => v.status === "open").length,
      recentWarnings: warnings.length,
    };

    return {
      pool: {
        ...summary,
        governanceVerified: Boolean(row.governance_verified),
        governanceApproved: Boolean(row.governance_approved),
        pauseNewInvestments: Boolean(row.pause_new_investments),
        pauseWithdrawals: Boolean(row.pause_withdrawals),
        freezeMarketing: Boolean(row.freeze_marketing),
        hideFromMarketplace: Boolean(row.hide_from_marketplace),
        requireAdditionalReview: Boolean(row.require_additional_review),
        tradingSuspended: Boolean(row.trading_suspended),
        suspensionReason: (row.suspension_reason as string | null) ?? null,
        suspensionNotes: (row.suspension_notes as string | null) ?? null,
        suspendedAt: (row.suspended_at as string | null) ?? null,
        probationEndsAt: (row.probation_ends_at as string | null) ?? null,
        probationNotes: (row.probation_notes as string | null) ?? null,
        reviewFrequency: (row.review_frequency as string | null) ?? null,
        lifecycleStatus: (row.lifecycle_status as string) ?? "live",
      },
      violations,
      warnings,
      reviews,
      scores,
      timeline,
      protectionIndicators: buildProtectionIndicators(row),
      monitoringMetrics,
    };
  },

  async exportReport(reportType: string): Promise<string> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const label = GOVERNANCE_REPORT_LABELS[reportType] ?? reportType;

    if (reportType === "rule_violations") {
      const { data } = await db
        .from("pool_governance_violations")
        .select("fund_id, rule_name, actual_value, expected_value, severity, status, violation_at")
        .order("violation_at", { ascending: false });
      const rows = data ?? [];
      const header = "Pool ID,Rule,Actual,Expected,Severity,Status,Date\n";
      const body = rows
        .map((r) => {
          const row = r as Record<string, unknown>;
          return [
            row.fund_id,
            `"${row.rule_name}"`,
            row.actual_value,
            row.expected_value,
            row.severity,
            row.status,
            row.violation_at,
          ].join(",");
        })
        .join("\n");
      return `# ${label}\n${header}${body}`;
    }

    if (reportType === "governance_history") {
      const { data } = await db
        .from("pool_governance_timeline")
        .select("fund_id, event_type, title, previous_stage, new_stage, committee_label, created_at")
        .order("created_at", { ascending: false });
      const rows = data ?? [];
      const header = "Pool ID,Event,Title,From,To,Committee,Date\n";
      const body = rows
        .map((r) => {
          const row = r as Record<string, unknown>;
          return [
            row.fund_id,
            row.event_type,
            `"${row.title}"`,
            row.previous_stage,
            row.new_stage,
            `"${row.committee_label ?? ""}"`,
            row.created_at,
          ].join(",");
        })
        .join("\n");
      return `# ${label}\n${header}${body}`;
    }

    if (reportType === "suspension_history") {
      const { data } = await db
        .from("funds")
        .select("id, name, suspension_reason, suspended_at, pool_health, governance_stage")
        .or("pool_health.eq.suspended,governance_stage.eq.suspended");
      const rows = data ?? [];
      const header = "Pool ID,Name,Reason,Suspended At,Health,Stage\n";
      const body = rows
        .map((r) => {
          const row = r as Record<string, unknown>;
          return [
            row.id,
            `"${row.name}"`,
            `"${row.suspension_reason ?? ""}"`,
            row.suspended_at,
            row.pool_health,
            row.governance_stage,
          ].join(",");
        })
        .join("\n");
      return `# ${label}\n${header}${body}`;
    }

    return `# ${label}\nNo data exported for this report type yet.\n`;
  },

  buildProtectionIndicators(row: FundRow): string[] {
    return buildProtectionIndicators(row);
  },
};