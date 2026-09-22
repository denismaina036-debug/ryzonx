import type { TradeEntry } from "@/domain/trading-journal/types";
import { createAdminClient } from "@/lib/supabase/admin";

export const copierTradeResultService = {
  /**
   * Persist an immutable per-copier trade result for history only. The existing
   * settlement engine supplies the projection and remains solely responsible
   * for every capital, wallet, fee, and ledger mutation.
   */
  async recordForCompletedTrade(tradeEntry: TradeEntry): Promise<void> {
    const realizedPnl = tradeEntry.realizedPnl ?? 0;
    if (tradeEntry.status !== "closed" || !Number.isFinite(realizedPnl)) return;

    const { profitDistributionService } = await import(
      "@/services/profit-distribution.service"
    );
    const projected = await profitDistributionService.projectInvestorProfitForCycle(
      tradeEntry.investmentCycleId,
      realizedPnl
    );
    if (projected.length === 0) return;

    const db = createAdminClient();
    const { error } = await db.from("copier_trade_results" as never).upsert(
      projected.map((result) => ({
        trade_entry_id: tradeEntry.id,
        investment_cycle_id: tradeEntry.investmentCycleId,
        investment_allocation_id: result.allocationId,
        investor_id: result.investorId,
        result_amount: result.projectedProfit,
      })) as never,
      { onConflict: "trade_entry_id,investment_allocation_id", ignoreDuplicates: true }
    );
    if (error) throw new Error(error.message);
  },
};
