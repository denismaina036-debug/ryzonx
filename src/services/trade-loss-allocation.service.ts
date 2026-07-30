import { createAdminClient } from "@/lib/supabase/admin";
import { computeTradeRealizedPnl } from "@/lib/financial/profit-distribution-calculator";
import type { TradeEntryResult } from "@/constants/trade-entry";
import { TRADE_ENTRY_RESULTS } from "@/constants/trade-entry";
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

export function resolveTradeResult(
  pnl: number,
  explicit?: TradeEntryResult | null
): TradeEntryResult {
  if (explicit && TRADE_ENTRY_RESULTS.includes(explicit)) return explicit;
  if (pnl > 0) return "profit";
  if (pnl < 0) return "loss";
  return "breakeven";
}

export const tradeLossAllocationService = {
  resolveTradeResult,
  computeRealizedPnl: computeTradeRealizedPnl,

  /**
   * Apply proportional investor capital write-down when a losing trade closes.
   * Loss allocation is based on each investor's share of cycle raised capital.
   */
  async applyLossToCycle(input: {
    tradeEntry: TradeEntry;
    lossAmount: number;
    actorId: string;
  }): Promise<void> {
    const { tradeEntry, lossAmount, actorId } = input;
    if (lossAmount <= 0) return;
    if (tradeEntry.lossAppliedAt) return;

    const allocations = await loadCycleAllocations(tradeEntry.investmentCycleId);
    if (allocations.length === 0) {
      throw new Error(
        "No investor allocations found for this cycle. Commitments must exist before loss can be applied."
      );
    }

    const poolTotal = roundMoney(allocations.reduce((s, a) => s + a.amount, 0));
    const effectiveLoss = roundMoney(Math.min(lossAmount, poolTotal));
    if (effectiveLoss <= 0) return;

    const shares = distributeProRataAmount(effectiveLoss, allocations, "debit");
    const fundId = await resolveFundIdForCycle(tradeEntry.investmentCycleId);
    const db = createAdminClient();

    for (const share of shares) {
      if (share.share <= 0) continue;

      const { error: updateError } = await db
        .from("investment_allocations")
        .update({ amount: share.newAmount } as never)
        .eq("id", share.allocationId);

      if (updateError) throw new Error(updateError.message);

      await db.from("trade_loss_allocations" as never).insert({
        trade_entry_id: tradeEntry.id,
        investment_cycle_id: tradeEntry.investmentCycleId,
        investment_allocation_id: share.allocationId,
        investor_id: share.investorId,
        loss_amount: share.share,
        ownership_pct: share.ownershipPct,
        previous_amount: share.previousAmount,
        new_amount: share.newAmount,
      } as never);

      if (fundId) {
        await applyInvestorPortfolioDelta({
          fundId,
          investorId: share.investorId,
          delta: -share.share,
        });
      }
    }

    await db
      .from("trade_entries")
      .update({ loss_applied_at: new Date().toISOString() } as never)
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
            pool_value: roundMoney(Math.max(0, Number(fund.pool_value ?? 0) - effectiveLoss)),
            current_capital: roundMoney(Math.max(0, Number(fund.current_capital ?? 0) - effectiveLoss)),
            investor_capital: roundMoney(Math.max(0, Number(fund.investor_capital ?? 0) - effectiveLoss)),
          } as never)
          .eq("id", fundId);
      }
    }

    await auditService.log({
      actorId,
      action: "trade_loss_applied",
      entityType: "trade_entry",
      entityId: tradeEntry.id,
      newValues: {
        cycleId: tradeEntry.investmentCycleId,
        lossAmount: effectiveLoss,
        investorCount: shares.length,
        tradeReference: tradeEntry.tradeReference,
      },
    });
  },
};
