import { investmentCycleService } from "@/services/investment-cycle.service";
import { cycleProgressService } from "@/services/cycle-progress.service";
import { performanceIntelligenceService } from "@/services/performance-intelligence.service";
import { ratingEngineService } from "@/services/rating-engine.service";
import { ratingHistoryService } from "@/services/rating-history.service";
import { CYCLE_PROGRESS_PHASE_LABELS } from "@/constants/cycle-progress";
import type { CycleIntelligence } from "@/domain/performance-intelligence/types";

function phaseCompletionPct(phase: string): number {
  const order = ["funding", "trading", "monitoring", "distribution_pending", "completed"];
  const idx = order.indexOf(phase);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / order.length) * 100);
}

export const cycleIntelligenceService = {
  async getForCycle(cycleId: string): Promise<CycleIntelligence> {
    const cycle = await investmentCycleService.getById(cycleId);
    if (!cycle) throw new Error("Cycle not found.");

    const [metrics, progress] = await Promise.all([
      performanceIntelligenceService.getCycleMetrics(cycle),
      cycleProgressService.getSummary(cycleId).catch(() => null),
    ]);

    let rating = await ratingHistoryService.getLatestSnapshot("investment_cycle", cycleId);
    if (!rating && metrics.totalTrades > 0) {
      rating = await ratingEngineService.recalculateCycle(
        cycleId,
        "Cycle intelligence rating computed"
      ).catch(() => null);
    }

    const fundingVelocity =
      cycle.fundingStartedAt && cycle.tradingStartedAt
        ? (new Date(cycle.tradingStartedAt).getTime() -
            new Date(cycle.fundingStartedAt).getTime()) /
          (1000 * 60 * 60 * 24)
        : null;

    return {
      cycleId,
      cycleName: cycle.name,
      fundingVelocity,
      tradingActivity: metrics.totalTrades,
      operationalHealth: rating?.operationalScore ?? Math.min(100, metrics.snapshotCount * 15 + metrics.totalTrades * 5),
      currentProgressPhase: progress
        ? CYCLE_PROGRESS_PHASE_LABELS[progress.currentPhase]
        : cycle.status,
      completionPercentage: progress
        ? phaseCompletionPct(progress.currentPhase)
        : cycle.status === "completed"
          ? 100
          : 0,
      journalActivity: metrics.journalEventCount,
      investorParticipation: metrics.totalInvestors,
      rating,
    };
  },

  async getForCycleSlug(slug: string): Promise<CycleIntelligence | null> {
    const cycle = await investmentCycleService.getPublicBySlug(slug);
    if (!cycle) return null;
    return this.getForCycle(cycle.id);
  },
};
