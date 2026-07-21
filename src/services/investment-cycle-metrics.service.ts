import { createAdminClient } from "@/lib/supabase/admin";
import type { InvestmentAllocationStatus } from "@/constants/investment-allocation";
import {
  applyCycleFundingMetrics,
  COMMITTED_ALLOCATION_STATUSES,
  RAISED_CAPITAL_ALLOCATION_STATUSES,
} from "@/domain/investment/cycle-metrics";
import type { InvestmentCycle } from "@/domain/investment/types";

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

async function sumAllocationAmounts(
  cycleIds: string[],
  statuses: InvestmentAllocationStatus[]
): Promise<Map<string, number>> {
  const totals = new Map<string, number>();
  if (cycleIds.length === 0) return totals;

  const db = createAdminClient();
  const { data, error } = await db
    .from("investment_allocations")
    .select("investment_cycle_id, amount")
    .in("investment_cycle_id", cycleIds)
    .in("status", statuses);

  if (error) throw new Error(error.message);

  for (const row of (data ?? []) as Array<{ investment_cycle_id: string; amount: string | number }>) {
    const cycleId = row.investment_cycle_id;
    totals.set(cycleId, (totals.get(cycleId) ?? 0) + toNumber(row.amount));
  }

  return totals;
}

export const investmentCycleMetricsService = {
  async sumRaisedCapitalForCycle(cycleId: string): Promise<number> {
    const totals = await sumAllocationAmounts([cycleId], RAISED_CAPITAL_ALLOCATION_STATUSES);
    return totals.get(cycleId) ?? 0;
  },

  async sumCommittedCapitalForCycle(cycleId: string): Promise<number> {
    const totals = await sumAllocationAmounts([cycleId], COMMITTED_ALLOCATION_STATUSES);
    return totals.get(cycleId) ?? 0;
  },

  async sumRaisedCapitalForCycles(cycleIds: string[]): Promise<Map<string, number>> {
    return sumAllocationAmounts(cycleIds, RAISED_CAPITAL_ALLOCATION_STATUSES);
  },

  async recalculateCycleRaisedCapital(cycleId: string): Promise<number> {
    const raisedCapital = await this.sumRaisedCapitalForCycle(cycleId);
    const db = createAdminClient();
    const { error } = await db
      .from("investment_cycles")
      .update({ raised_capital: raisedCapital } as never)
      .eq("id", cycleId);

    if (error) throw new Error(error.message);
    return raisedCapital;
  },

  async enrichCycles(cycles: InvestmentCycle[]): Promise<InvestmentCycle[]> {
    if (cycles.length === 0) return cycles;
    const raisedByCycle = await this.sumRaisedCapitalForCycles(cycles.map((cycle) => cycle.id));
    return cycles.map((cycle) =>
      applyCycleFundingMetrics(cycle, raisedByCycle.get(cycle.id) ?? 0)
    );
  },

  async enrichCycle(cycle: InvestmentCycle | null): Promise<InvestmentCycle | null> {
    if (!cycle) return null;
    const [enriched] = await this.enrichCycles([cycle]);
    return enriched ?? null;
  },
};
