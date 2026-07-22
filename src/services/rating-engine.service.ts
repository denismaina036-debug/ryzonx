import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { RATING_AUDIT_ACTIONS, RATING_ENTITY_TYPE } from "@/constants/rating";
import type { RatingEntityType } from "@/constants/rating";
import { auditService } from "@/services/audit.service";
import { ratingConfigurationService } from "@/services/rating-configuration.service";
import { ratingHistoryService } from "@/services/rating-history.service";
import { performanceIntelligenceService } from "@/services/performance-intelligence.service";
import { strategyService } from "@/services/strategy.service";
import { investmentCycleService } from "@/services/investment-cycle.service";
import {
  computeCategoryScores,
  computeWeightedRating,
  deriveGrades,
  deriveTrend,
  scoreToStars,
} from "@/lib/performance-intelligence/scoring";
import type { RatingSnapshot } from "@/domain/performance-intelligence/types";
import { publishPlatformEvent, PLATFORM_EVENT_TYPES } from "@/lib/platform-events/publish";
import { resolvePoolManagerUserId } from "@/lib/platform-events/resolve-recipients";

export const ratingEngineService = {
  async computeRating(
    entityType: RatingEntityType,
    entityId: string,
    metrics: Awaited<ReturnType<typeof performanceIntelligenceService.getManagerMetrics>>,
    reason: string,
    actorId?: string | null
  ): Promise<RatingSnapshot> {
    const config = await ratingConfigurationService.getActiveProfile();
    if (!config) throw new Error("No active rating profile configured.");

    const { profile, weights } = config;
    const categoryResults = computeCategoryScores(metrics, profile.rules);
    const { overallScore } = computeWeightedRating(categoryResults, weights);
    const grades = deriveGrades(overallScore, categoryResults, profile.rules);
    const overallRating = scoreToStars(overallScore, profile.rules);

    const existing = await ratingHistoryService.getLatestSnapshot(entityType, entityId);
    const trend = deriveTrend(existing?.overallScore ?? null, overallScore);

    const categoryScores: Record<string, number> = {};
    const explanations: Record<string, string> = {};
    for (const [key, val] of Object.entries(categoryResults)) {
      categoryScores[key] = val.score;
      explanations[key] = val.explanation;
    }

    const { snapshot } = await ratingHistoryService.saveSnapshot({
      entityType,
      entityId,
      profileId: profile.id,
      overallScore,
      overallRating,
      performanceGrade: grades.performanceGrade,
      riskGrade: grades.riskGrade,
      governanceGrade: grades.governanceGrade,
      consistencyScore: grades.consistencyScore,
      operationalScore: grades.operationalScore,
      confidenceScore: grades.confidenceScore,
      categoryScores,
      explanations,
      sourceMetrics: metrics as unknown as Record<string, unknown>,
      trend,
      reason,
      actorId,
    });

    if (entityType === "pool_manager") {
      const db = createAdminClient();
      // Preserve admin Overall Rating until there is enough live operational data.
      // Empty-metric recalcs otherwise overwrite approval ratings with ~2.5 stars.
      const hasSufficientData =
        metrics.closedTrades >= 3 ||
        metrics.completedCycles >= 1 ||
        metrics.totalInvestors > 0;

      const { data: managerRow } = await db
        .from("pool_managers")
        .select("ryvonx_rating")
        .eq("id", entityId)
        .maybeSingle();
      const adminRating =
        (managerRow as { ryvonx_rating?: number | null } | null)?.ryvonx_rating ?? null;

      const ratingPatch: Record<string, unknown> = {
        win_rate_pct: metrics.winRate * 100,
      };
      if (hasSufficientData || adminRating == null) {
        ratingPatch.ryvonx_rating = overallRating;
      }

      await db
        .from("pool_managers")
        .update(ratingPatch as never)
        .eq("id", entityId);

      const publishedRating =
        hasSufficientData || adminRating == null ? overallRating : Number(adminRating);
      const previousRating = existing?.overallRating ?? null;
      if (previousRating !== publishedRating && (hasSufficientData || adminRating == null)) {
        const poolManagerUserId = await resolvePoolManagerUserId(entityId);
        publishPlatformEvent({
          eventType: PLATFORM_EVENT_TYPES.RATING_CHANGED,
          category: "performance",
          entityType: "pool_manager",
          entityId,
          actorId: actorId ?? null,
          payload: {
            poolManagerUserId,
            previousRating,
            newRating: publishedRating,
            overallScore,
            trend,
            reason,
            summary: `Rating changed from ${previousRating ?? "none"} to ${publishedRating}`,
          },
        });
      }
    }

    return snapshot;
  },

  async recalculateManager(managerId: string, reason: string, actorId?: string | null) {
    const metrics = await performanceIntelligenceService.getManagerMetrics(managerId);
    return this.computeRating("pool_manager", managerId, metrics, reason, actorId);
  },

  async recalculateStrategy(strategyId: string, reason: string, actorId?: string | null) {
    const strategy = await strategyService.getById(strategyId);
    if (!strategy) throw new Error("Strategy not found.");

    const db = createAdminClient();
    const { data } = await db.from("investment_cycles").select("id").eq("strategy_id", strategyId);
    const cycles = [];
    for (const row of (data ?? []) as Array<{ id: string }>) {
      const cycle = await investmentCycleService.getById(row.id);
      if (cycle) cycles.push(cycle);
    }

    const metrics = await performanceIntelligenceService.getStrategyMetrics(strategy, cycles);
    return this.computeRating("strategy", strategyId, metrics, reason, actorId);
  },

  async recalculateCycle(cycleId: string, reason: string, actorId?: string | null) {
    const cycle = await investmentCycleService.getById(cycleId);
    if (!cycle) throw new Error("Cycle not found.");
    const metrics = await performanceIntelligenceService.getCycleMetrics(cycle);
    return this.computeRating("investment_cycle", cycleId, metrics, reason, actorId);
  },

  async recalculateAll(actorId?: string | null): Promise<{ managers: number; strategies: number; cycles: number }> {
    if (actorId) await requireRole(USER_ROLES.ADMINISTRATOR);

    const db = createAdminClient();
    const reason = "Platform-wide rating recalculation";

    const { data: managers } = await db
      .from("pool_managers")
      .select("id")
      .eq("status", "approved");

    for (const m of (managers ?? []) as Array<{ id: string }>) {
      await this.recalculateManager(m.id, reason, actorId);
    }

    const { data: strategies } = await db.from("strategies").select("id").neq("status", "draft");
    for (const s of (strategies ?? []) as Array<{ id: string }>) {
      await this.recalculateStrategy(s.id, reason, actorId).catch(() => undefined);
    }

    const { data: cycles } = await db
      .from("investment_cycles")
      .select("id")
      .in("status", ["funding", "trading", "distribution", "completed", "archived"]);
    for (const c of (cycles ?? []) as Array<{ id: string }>) {
      await this.recalculateCycle(c.id, reason, actorId).catch(() => undefined);
    }

    if (actorId) {
      await auditService.log({
        actorId,
        action: RATING_AUDIT_ACTIONS.RECALCULATED,
        entityType: RATING_ENTITY_TYPE,
        entityId: null,
        newValues: {
          managers: (managers ?? []).length,
          strategies: (strategies ?? []).length,
          cycles: (cycles ?? []).length,
        },
      });
    }

    return {
      managers: (managers ?? []).length,
      strategies: (strategies ?? []).length,
      cycles: (cycles ?? []).length,
    };
  },
};
