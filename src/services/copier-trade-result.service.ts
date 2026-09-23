import type { TradeEntry } from "@/domain/trading-journal/types";
import { createAdminClient } from "@/lib/supabase/admin";

type ClosedTradeRow = { id: string; realized_pnl: number | string };
type CopierProjection = { allocationId: string; investorId: string; projectedProfit: number };
type CopierTradeResultRow = {
  trade_entry_id: string;
  investment_cycle_id: string;
  investment_allocation_id: string;
  investor_id: string;
  result_amount: number;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Convert cumulative cycle projections into one independently traceable delta
 * per trade. Summing the rows for an allocation always reproduces the same
 * cumulative result that final settlement will calculate for the cycle.
 */
export async function buildIncrementalCopierTradeResults(
  cycleId: string,
  trades: readonly ClosedTradeRow[],
  projectCumulativeResult: (grossCyclePnl: number) => Promise<CopierProjection[]>
): Promise<CopierTradeResultRow[]> {
  const rows: CopierTradeResultRow[] = [];
  const previousProjection = new Map<string, number>();
  let cumulativeGrossPnl = 0;

  for (const trade of trades) {
    cumulativeGrossPnl = roundMoney(cumulativeGrossPnl + Number(trade.realized_pnl));
    const projections = await projectCumulativeResult(cumulativeGrossPnl);
    for (const projection of projections) {
      const prior = previousProjection.get(projection.allocationId) ?? 0;
      const cumulative = roundMoney(projection.projectedProfit);
      rows.push({
        trade_entry_id: trade.id,
        investment_cycle_id: cycleId,
        investment_allocation_id: projection.allocationId,
        investor_id: projection.investorId,
        result_amount: roundMoney(cumulative - prior),
      });
      previousProjection.set(projection.allocationId, cumulative);
    }
  }
  return rows;
}

export const copierTradeResultService = {
  /**
   * Persist cumulative-safe per-copier trade history without moving money.
   * Final settlement remains solely responsible for wallets, ledgers, fees,
   * portfolios, and allocation return state.
   */
  async recordForCompletedTrade(tradeEntry: TradeEntry): Promise<void> {
    const realizedPnl = tradeEntry.realizedPnl ?? 0;
    if (tradeEntry.status !== "closed" || !Number.isFinite(realizedPnl)) return;

    const db = createAdminClient();
    const { data: tradeRows, error: tradeError } = await db
      .from("trade_entries")
      .select("id, realized_pnl")
      .eq("investment_cycle_id", tradeEntry.investmentCycleId)
      .eq("status", "closed")
      .order("closed_at", { ascending: true });
    if (tradeError) throw new Error(tradeError.message);

    const trades = ((tradeRows ?? []) as ClosedTradeRow[]).filter((trade) =>
      Number.isFinite(Number(trade.realized_pnl))
    );
    if (trades.length === 0) return;

    const { profitDistributionService } = await import(
      "@/services/profit-distribution.service"
    );
    const rows = await buildIncrementalCopierTradeResults(
      tradeEntry.investmentCycleId,
      trades,
      (grossCyclePnl) =>
        profitDistributionService.projectInvestorProfitForCycle(
          tradeEntry.investmentCycleId,
          grossCyclePnl
        )
    );
    if (rows.length === 0) return;

    const { error } = await db.from("copier_trade_results" as never).upsert(rows as never, {
      onConflict: "trade_entry_id,investment_allocation_id",
    });
    if (error) throw new Error(error.message);
  },
};
