import { createAdminClient } from "@/lib/supabase/admin";
import { RAISED_CAPITAL_ALLOCATION_STATUSES } from "@/domain/investment/cycle-metrics";
import { computeTradeRealizedPnl } from "@/lib/financial/profit-distribution-calculator";
import type { TradeEntryDirection, TradeEntryResult, TradeEntryStatus } from "@/constants/trade-entry";
import { TRADE_ENTRY_RESULTS } from "@/constants/trade-entry";
import { auditService } from "@/services/audit.service";
import { investmentCycleMetricsService } from "@/services/investment-cycle-metrics.service";
import type { TradeEntry } from "@/domain/trading-journal/types";

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

function distributeProRataLoss(
  lossAmount: number,
  allocations: Array<{ id: string; investorId: string; amount: number }>
): Array<{
  allocationId: string;
  investorId: string;
  lossShare: number;
  ownershipPct: number;
  previousAmount: number;
  newAmount: number;
}> {
  const total = roundMoney(allocations.reduce((s, a) => s + a.amount, 0));
  if (total <= 0 || lossAmount <= 0) return [];

  let allocated = 0;
  const rows = allocations.map((alloc, index) => {
    const ownershipPct = alloc.amount / total;
    let lossShare: number;
    if (index === allocations.length - 1) {
      lossShare = roundMoney(lossAmount - allocated);
    } else {
      lossShare = roundMoney(lossAmount * ownershipPct);
      allocated += lossShare;
    }
    const newAmount = roundMoney(Math.max(0, alloc.amount - lossShare));
    return {
      allocationId: alloc.id,
      investorId: alloc.investorId,
      lossShare,
      ownershipPct: roundMoney(ownershipPct * 1_000_000) / 1_000_000,
      previousAmount: alloc.amount,
      newAmount,
    };
  });

  return rows;
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

    const db = createAdminClient();
    const { data: allocationRows, error } = await db
      .from("investment_allocations")
      .select("id, investor_id, amount")
      .eq("investment_cycle_id", tradeEntry.investmentCycleId)
      .in("status", RAISED_CAPITAL_ALLOCATION_STATUSES);

    if (error) throw new Error(error.message);

    const allocations = ((allocationRows ?? []) as Array<{
      id: string;
      investor_id: string;
      amount: string | number;
    }>).map((row) => ({
      id: row.id,
      investorId: row.investor_id,
      amount: typeof row.amount === "number" ? row.amount : Number(row.amount),
    }));

    const effectiveLoss = roundMoney(Math.min(lossAmount, allocations.reduce((s, a) => s + a.amount, 0)));
    if (effectiveLoss <= 0 || allocations.length === 0) return;

    const shares = distributeProRataLoss(effectiveLoss, allocations);

    for (const share of shares) {
      if (share.lossShare <= 0) continue;

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
        loss_amount: share.lossShare,
        ownership_pct: share.ownershipPct,
        previous_amount: share.previousAmount,
        new_amount: share.newAmount,
      } as never);
    }

    await db
      .from("trade_entries")
      .update({ loss_applied_at: new Date().toISOString() } as never)
      .eq("id", tradeEntry.id);

    await investmentCycleMetricsService.recalculateCycleRaisedCapital(tradeEntry.investmentCycleId);

    const { data: cycleRow } = await db
      .from("investment_cycles")
      .select("fund_id")
      .eq("id", tradeEntry.investmentCycleId)
      .maybeSingle();

    const fundId = (cycleRow as { fund_id?: string | null } | null)?.fund_id;
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
