import { investmentCycleService } from "@/services/investment-cycle.service";
import type { InvestmentCycleStatus } from "@/constants/investment-cycle";
import { cycleOwnershipService } from "./cycle-ownership.service";
import { investmentQueueService } from "./investment-queue.service";
import { poolCapitalService } from "./pool-capital.service";
import { cycleProfitService } from "./cycle-profit.service";

export const cycleLifecycleOrchestrator = {
  /** Called when a cycle enters trading — freeze ownership for settlement. */
  async onTradingStarted(cycleId: string, fundId: string | null): Promise<void> {
    if (!fundId) return;
    await cycleOwnershipService.captureSnapshot(cycleId, fundId);
  },

  /** Recalculate cached cycle profit from journal (e.g. backfill). */
  async reconcileCycleProfit(cycleId: string): Promise<number> {
    return cycleProfitService.recalculateCycleProfit(cycleId);
  },

  /**
   * After settlement distribution completes: process queued capital movements,
   * mark cycle completed, and auto-open the next funding cycle.
   */
  async onSettlementDistributed(cycleId: string, actorUserId: string): Promise<void> {
    const cycle = await investmentCycleService.getById(cycleId);
    if (!cycle?.fundId) return;

    await investmentQueueService.processPendingForFund(cycle.fundId);
    await poolCapitalService.syncFundInvestorCapital(cycle.fundId);

    if (cycle.status === "distribution") {
      await investmentCycleService.systemTransition(cycleId, "completed", actorUserId);
    }

    await this.autoCreateNextFundingCycle(cycle.fundId, actorUserId);
  },

  async autoCreateNextFundingCycle(fundId: string, actorUserId: string): Promise<void> {
    const cycles = await investmentCycleService.listByFund(fundId);
    const active = cycles.find((c) =>
      ["funding", "trading", "distribution", "approved"].includes(c.status)
    );
    if (active) return;

    const last = cycles[0];
    if (last && !["completed", "archived"].includes(last.status)) return;

    try {
      const next = await investmentCycleService.createFromPoolAsSystem({
        fundId,
        actorUserId,
      });
      await investmentCycleService.systemActivateCycleForFunding(next.id, actorUserId);
    } catch {
      /* next cycle may already exist */
    }
  },

  isCapitalMutableStatus(status: InvestmentCycleStatus): boolean {
    return status === "funding" || status === "approved";
  },

  shouldQueueCapitalChange(status: InvestmentCycleStatus): boolean {
    return status === "trading" || status === "distribution";
  },
};
