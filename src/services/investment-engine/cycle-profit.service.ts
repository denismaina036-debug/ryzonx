import { createAdminClient } from "@/lib/supabase/admin";
import { roundMoney } from "@/lib/investment-engine/ownership";

export const cycleProfitService = {
  async recalculateCycleProfit(cycleId: string): Promise<number> {
    const db = createAdminClient();
    const { data: trades, error: tradesError } = await db
      .from("trade_entries")
      .select("realized_pnl, status")
      .eq("investment_cycle_id", cycleId)
      .eq("status", "closed");
    if (tradesError) throw new Error(tradesError.message);

    const total = roundMoney(
      ((trades ?? []) as Array<{ realized_pnl: number | string | null }>).reduce(
        (sum, t) => sum + Number(t.realized_pnl ?? 0),
        0
      )
    );

    const { error } = await db
      .from("investment_cycles")
      .update({ current_cycle_profit: total } as never)
      .eq("id", cycleId);
    if (error) throw new Error(error.message);
    return total;
  },

  async getCycleProfit(cycleId: string): Promise<number> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("investment_cycles")
      .select("current_cycle_profit")
      .eq("id", cycleId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return 0;
    return roundMoney(Number((data as { current_cycle_profit: number | string }).current_cycle_profit ?? 0));
  },

  async applyTradeCloseDelta(cycleId: string, deltaPnl: number): Promise<number> {
    const current = await this.getCycleProfit(cycleId);
    const next = roundMoney(current + deltaPnl);
    const db = createAdminClient();
    const { error } = await db
      .from("investment_cycles")
      .update({ current_cycle_profit: next } as never)
      .eq("id", cycleId);
    if (error) throw new Error(error.message);
    return next;
  },
};
