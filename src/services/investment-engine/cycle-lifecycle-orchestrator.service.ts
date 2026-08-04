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

  /** After settlement distribution completes: process queued capital movements. */
  async onSettlementDistributed(cycleId: string, _actorUserId: string): Promise<void> {
    const cycle = await investmentCycleService.getById(cycleId);
    if (!cycle?.fundId) return;

    await investmentQueueService.processPendingForFund(cycle.fundId);
    await poolCapitalService.syncFundInvestorCapital(cycle.fundId);
  },

  isCapitalMutableStatus(status: InvestmentCycleStatus): boolean {
    return status === "funding" || status === "approved";
  },

  shouldQueueCapitalChange(status: InvestmentCycleStatus): boolean {
    return status === "trading" || status === "distribution";
  },
};
