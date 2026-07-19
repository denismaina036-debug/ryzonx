import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { ratingEngineService } from "@/services/rating-engine.service";
import { ratingHistoryService } from "@/services/rating-history.service";
import { ratingConfigurationService } from "@/services/rating-configuration.service";
import { performanceIntelligenceService } from "@/services/performance-intelligence.service";
import {
  deriveStrengthsAndImprovements,
  computeCategoryScores,
  computeWeightedRating,
} from "@/lib/performance-intelligence/scoring";
import type {
  AdminIntelligenceDashboard,
  ManagerRatingResult,
  PerformanceIntelligenceBundle,
  InvestorRatingView,
  StrategyIntelligence,
  CycleIntelligence,
} from "@/domain/performance-intelligence/types";

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

export const managerRatingService = {
  async getOrCompute(managerId: string): Promise<ManagerRatingResult> {
    let snapshot = await ratingHistoryService.getLatestSnapshot("pool_manager", managerId);
    if (!snapshot) {
      snapshot = await ratingEngineService.recalculateManager(
        managerId,
        "Initial rating computation from operational data"
      );
    }

    const config = await ratingConfigurationService.getActiveProfile();
    const metrics = await performanceIntelligenceService.getManagerMetrics(managerId);
    const categoryResults = config
      ? computeCategoryScores(metrics, config.profile.rules)
      : {};
    const { breakdown } = config
      ? computeWeightedRating(categoryResults, config.weights)
      : { breakdown: [] };

    const history = await ratingHistoryService.listHistory("pool_manager", managerId, 10);
    const { strengths, improvements } = deriveStrengthsAndImprovements(breakdown);

    return { snapshot, breakdown: breakdown as ManagerRatingResult["breakdown"], history, strengths, improvements };
  },

  async getForCurrentManager(): Promise<ManagerRatingResult> {
    const managerId = await this.getCurrentManagerId();
    return this.getOrCompute(managerId);
  },

  async getPerformanceBundleForCurrentManager(): Promise<PerformanceIntelligenceBundle> {
    const managerId = await this.getCurrentManagerId();
    return this.getPerformanceBundle(managerId);
  },

  async getCurrentManagerId(): Promise<string> {
    const user = await requireRole(USER_ROLES.POOL_MANAGER);
    const managerId = await getManagerIdForUser(user.id);
    if (!managerId) throw new Error("Pool Manager profile not found.");
    return managerId;
  },

  async getInvestorView(managerId: string): Promise<InvestorRatingView | null> {
    const db = createAdminClient();
    const { data: manager } = await db
      .from("pool_managers")
      .select("id, status")
      .eq("id", managerId)
      .maybeSingle();
    if (!manager || (manager as { status: string }).status !== "approved") return null;

    const result = await this.getOrCompute(managerId);
    const { snapshot } = result;

    return {
      overallRating: snapshot.overallRating,
      overallScore: snapshot.overallScore,
      performanceGrade: snapshot.performanceGrade,
      riskGrade: snapshot.riskGrade,
      confidenceScore: snapshot.confidenceScore,
      trend: snapshot.trend,
      breakdown: result.breakdown.map((b) => ({
        label: b.label,
        score: Math.round(b.score),
        explanation: b.explanation,
      })),
      comparedTo: "Platform average (benchmark placeholder)",
    };
  },

  async getPerformanceBundle(managerId: string): Promise<PerformanceIntelligenceBundle> {
    const db = createAdminClient();
    const { data: strategyRows } = await db
      .from("strategies")
      .select("id")
      .eq("pool_manager_id", managerId);

    const { data: cycleRows } = await db
      .from("investment_cycles")
      .select("id")
      .eq("pool_manager_id", managerId);

    const { strategyIntelligenceService } = await import("@/services/strategy-intelligence.service");
    const { cycleIntelligenceService } = await import("@/services/cycle-intelligence.service");

    const strategyIntel = await Promise.all(
      ((strategyRows ?? []) as Array<{ id: string }>).map((s) =>
        strategyIntelligenceService.getForStrategy(s.id).catch(() => null)
      )
    );

    const cycleIntel = await Promise.all(
      ((cycleRows ?? []) as Array<{ id: string }>).map((c) =>
        cycleIntelligenceService.getForCycle(c.id).catch(() => null)
      )
    );

    const metrics = await performanceIntelligenceService.getManagerMetrics(managerId);

    return {
      managerId,
      strategies: strategyIntel.filter(Boolean) as StrategyIntelligence[],
      cycles: cycleIntel.filter(Boolean) as CycleIntelligence[],
      platformMetrics: metrics as unknown as Record<string, unknown>,
    };
  },

  async getAdminDashboard(): Promise<AdminIntelligenceDashboard> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const { data: snapshots } = await db
      .from("rating_snapshots")
      .select("entity_id, overall_rating, overall_score, risk_grade, governance_grade")
      .eq("entity_type", "pool_manager");

    const { data: managers } = await db
      .from("pool_managers")
      .select("id, display_name")
      .eq("status", "approved");

    const managerMap = new Map(
      ((managers ?? []) as Array<{ id: string; display_name: string }>).map((m) => [m.id, m.display_name])
    );

    const snapRows = (snapshots ?? []) as Array<{
      entity_id: string;
      overall_rating: number;
      overall_score: number;
      risk_grade: string;
      governance_grade: string;
    }>;

    const topManagers = [...snapRows]
      .sort((a, b) => b.overall_rating - a.overall_rating)
      .slice(0, 10)
      .map((s) => ({
        managerId: s.entity_id,
        name: managerMap.get(s.entity_id) ?? "Unknown",
        rating: s.overall_rating,
        score: s.overall_score,
      }));

    const highestRiskManagers = [...snapRows]
      .sort((a, b) => a.overall_score - b.overall_score)
      .slice(0, 10)
      .map((s) => ({
        managerId: s.entity_id,
        name: managerMap.get(s.entity_id) ?? "Unknown",
        riskGrade: s.risk_grade,
        score: s.overall_score,
      }));

    const governanceRankings = [...snapRows]
      .sort((a, b) => b.overall_score - a.overall_score)
      .slice(0, 10)
      .map((s) => ({
        managerId: s.entity_id,
        name: managerMap.get(s.entity_id) ?? "Unknown",
        governanceGrade: s.governance_grade,
        score: s.overall_score,
      }));

    const recentRatingChanges = await ratingHistoryService.listRecentChanges(15);
    const activeProfile = await ratingConfigurationService.getActiveProfile();

    const avgRating =
      snapRows.length > 0
        ? snapRows.reduce((s, r) => s + Number(r.overall_rating), 0) / snapRows.length
        : 0;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const ratingChangesLast30Days = recentRatingChanges.filter(
      (h) => h.createdAt >= thirtyDaysAgo
    ).length;

    const { count: alertCount } = await db
      .from("cycle_progress_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "operational_flag");

    return {
      topManagers,
      highestRiskManagers,
      governanceRankings,
      platformPerformance: {
        averageManagerRating: Math.round(avgRating * 10) / 10,
        managersRated: snapRows.length,
        ratingChangesLast30Days,
        operationalAlerts: alertCount ?? 0,
      },
      recentRatingChanges,
      activeProfile: activeProfile?.profile ?? null,
    };
  },
};
