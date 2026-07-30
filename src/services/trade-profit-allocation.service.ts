import { createAdminClient } from "@/lib/supabase/admin";
import { RAISED_CAPITAL_ALLOCATION_STATUSES } from "@/domain/investment/cycle-metrics";
import { auditService } from "@/services/audit.service";
import { investmentCycleMetricsService } from "@/services/investment-cycle-metrics.service";
import type { TradeEntry } from "@/domain/trading-journal/types";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function distributeProRataProfit(
  profitAmount: number,
  allocations: Array<{ id: string; investorId: string; amount: number }>
): Array<{
  allocationId: string;
  investorId: string;
  profitShare: number;
  ownershipPct: number;
  previousAmount: number;
  newAmount: number;
}> {
  const total = roundMoney(allocations.reduce((s, a) => s + a.amount, 0));
  if (total <= 0 || profitAmount <= 0) return [];

  let allocated = 0;
  return allocations.map((alloc, index) => {
    const ownershipPct = alloc.amount / total;
    let profitShare: number;
    if (index === allocations.length - 1) {
      profitShare = roundMoney(profitAmount - allocated);
    } else {
      profitShare = roundMoney(profitAmount * ownershipPct);
      allocated += profitShare;
    }
    const newAmount = roundMoney(alloc.amount + profitShare);
    return {
      allocationId: alloc.id,
      investorId: alloc.investorId,
      profitShare,
      ownershipPct: roundMoney(ownershipPct * 1_000_000) / 1_000_000,
      previousAmount: alloc.amount,
      newAmount,
    };
  });
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

    if (allocations.length === 0) return;

    const effectiveProfit = roundMoney(profitAmount);
    const shares = distributeProRataProfit(effectiveProfit, allocations);

    for (const share of shares) {
      if (share.profitShare <= 0) continue;

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
        profit_amount: share.profitShare,
        ownership_pct: share.ownershipPct,
        previous_amount: share.previousAmount,
        new_amount: share.newAmount,
      } as never);
    }

    await db
      .from("trade_entries")
      .update({ profit_applied_at: new Date().toISOString() } as never)
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
