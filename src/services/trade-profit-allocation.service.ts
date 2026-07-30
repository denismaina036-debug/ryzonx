import { createAdminClient } from "@/lib/supabase/admin";
import { auditService } from "@/services/audit.service";
import { investmentCycleMetricsService } from "@/services/investment-cycle-metrics.service";
import type { TradeEntry } from "@/domain/trading-journal/types";
import {
  applyInvestorPortfolioDelta,
  distributeProRataAmount,
  loadCycleAllocations,
  resolveFundIdForCycle,
} from "@/lib/financial/trade-balance-impact";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export const tradeProfitAllocationService = {
  /**
   * Apply proportional investor capital credit when a winning trade closes.
   * Profit allocation is based on each investor's share of cycle raised capital.
   */
  async applyProfitToCycle(input: {
    tradeEntry: TradeEntry;
    profitAmount: number;
    actorId: string;
  }): Promise<void> {
    const { tradeEntry, profitAmount, actorId } = input;
    if (profitAmount <= 0) return;
    if (tradeEntry.profitAppliedAt) return;

    const allocations = await loadCycleAllocations(tradeEntry.investmentCycleId);
    if (allocations.length === 0) {
      throw new Error(
        "No investor allocations found for this cycle. Commitments must exist before profit can be distributed."
      );
    }

    const effectiveProfit = roundMoney(profitAmount);
    const shares = distributeProRataAmount(effectiveProfit, allocations, "credit");
    const fundId = await resolveFundIdForCycle(tradeEntry.investmentCycleId);
    const db = createAdminClient();

    for (const share of shares) {
      if (share.share <= 0) continue;

      const { error: updateError } = await db
        .from("investment_allocations")
        .update({ amount: share.newAmount } as never)
        .eq("id", share.allocationId);

      if (updateError) throw new Error(updateError.message);

      await db.from("trade_profit_allocations" as never).insert({
        trade_entry_id: tradeEntry.id,
        investment_cycle_id: tradeEntry.investmentCycleId,
        investment_allocation_id: share.allocationId,
        investor_id: share.investorId,
        profit_amount: share.share,
        ownership_pct: share.ownershipPct,
        previous_amount: share.previousAmount,
        new_amount: share.newAmount,
      } as never);

      if (fundId) {
        await applyInvestorPortfolioDelta({
          fundId,
          investorId: share.investorId,
          delta: share.share,
        });
      }
    }

    await db
      .from("trade_entries")
      .update({ profit_applied_at: new Date().toISOString() } as never)
      .eq("id", tradeEntry.id);

    await investmentCycleMetricsService.recalculateCycleRaisedCapital(tradeEntry.investmentCycleId);

    if (fundId) {
      const { data: fundRow } = await db
        .from("funds")
        .select("pool_value, current_capital, investor_capital")
        .eq("id", fundId)
        .maybeSingle();

      if (fundRow) {
        const fund = fundRow as {
          pool_value?: number;
          current_capital?: number;
          investor_capital?: number;
        };
        await db
          .from("funds")
          .update({
            pool_value: roundMoney(Number(fund.pool_value ?? 0) + effectiveProfit),
            current_capital: roundMoney(Number(fund.current_capital ?? 0) + effectiveProfit),
            investor_capital: roundMoney(Number(fund.investor_capital ?? 0) + effectiveProfit),
          } as never)
          .eq("id", fundId);
      }
    }

    await auditService.log({
      actorId,
      action: "trade_profit_applied",
      entityType: "trade_entry",
      entityId: tradeEntry.id,
      newValues: {
        cycleId: tradeEntry.investmentCycleId,
        profitAmount: effectiveProfit,
        investorCount: shares.length,
        tradeReference: tradeEntry.tradeReference,
      },
    });
  },
};
