import { createAdminClient } from "@/lib/supabase/admin";
import { strategyService } from "@/services/strategy.service";
import { investmentCycleService } from "@/services/investment-cycle.service";
import { performanceIntelligenceService } from "@/services/performance-intelligence.service";
import { ratingEngineService } from "@/services/rating-engine.service";
import { ratingHistoryService } from "@/services/rating-history.service";
import type { InvestmentCycle } from "@/domain/investment/types";
import type { StrategyIntelligence } from "@/domain/performance-intelligence/types";

async function loadCyclesForStrategy(strategyId: string): Promise<InvestmentCycle[]> {
  const db = createAdminClient();
  const { data } = await db.from("investment_cycles").select("id").eq("strategy_id", strategyId);
  const ids = ((data ?? []) as Array<{ id: string }>).map((c) => c.id);
  const cycles: InvestmentCycle[] = [];
  for (const id of ids) {
    const cycle = await investmentCycleService.getById(id);
    if (cycle) cycles.push(cycle);
  }
  return cycles;
}

export const strategyIntelligenceService = {
  async getForStrategy(strategyId: string): Promise<StrategyIntelligence> {
    const strategy = await strategyService.getById(strategyId);
    if (!strategy) throw new Error("Strategy not found.");

    const cycleList = await loadCyclesForStrategy(strategyId);
    const metrics = await performanceIntelligenceService.getStrategyMetrics(strategy, cycleList);

    let rating = await ratingHistoryService.getLatestSnapshot("strategy", strategyId);
    if (!rating && cycleList.length > 0) {
      rating = await ratingEngineService
        .recalculateStrategy(strategyId, "Strategy intelligence rating computed")
        .catch(() => null);
    }

    const completed = cycleList.filter((c) => c.status === "completed" || c.status === "archived");
    const active = cycleList.filter((c) =>
      ["approved", "funding", "trading", "distribution"].includes(c.status)
    );

    return {
      strategyId,
      strategyName: strategy.name,
      historicalPerformanceScore: rating?.overallScore ?? metrics.winRate * 100,
      completionRate: metrics.completionRate,
      averageCycleDurationDays: metrics.averageCycleDurationDays,
      fundingSuccessRate: metrics.fundingSuccessRate,
      riskClassification: strategy.riskProfile?.replace(/_/g, " ") ?? "Unclassified",
      operationalHealth: rating?.operationalScore ?? Math.min(100, metrics.totalTrades * 10),
      benchmarkComparison: "Platform benchmark — external data deferred",
      activeCycles: active.length,
      completedCycles: completed.length,
      rating,
    };
  },

  async getForStrategySlug(slug: string): Promise<StrategyIntelligence | null> {
    const strategy = await strategyService.getPublicBySlug(slug);
    if (!strategy) return null;
    return this.getForStrategy(strategy.id);
  },
};
