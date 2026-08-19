import { createAdminClient } from "@/lib/supabase/admin";
import type { InvestmentAllocationStatus } from "@/constants/investment-allocation";
import {
  applyCycleFundingMetrics,
  COMMITTED_ALLOCATION_STATUSES,
  RAISED_CAPITAL_ALLOCATION_STATUSES,
} from "@/domain/investment/cycle-metrics";
import type { InvestmentCycle } from "@/domain/investment/types";
import { loadFundRaisedCapitalSeeds, mergePublicRaisedCapital } from "@/lib/pools/public-raised-capital";
import { readCycleInitialRaisedCapital } from "@/domain/pools/pool-config-snapshot";

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

async function countActiveInvestors(cycleId: string): Promise<number> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("investment_allocations")
    .select("investor_id")
    .eq("investment_cycle_id", cycleId)
    .in("status", COMMITTED_ALLOCATION_STATUSES);

  if (error) throw new Error(error.message);

  const unique = new Set(
    ((data ?? []) as Array<{ investor_id: string }>).map((row) => row.investor_id)
  );
  return unique.size;
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

  /**
   * Recalculate live Active Cycle funding metrics from allocations.
   * Raised Capital = confirmed investments; Investor Count = distinct committed investors.
   */
  async recalculateCycleRaisedCapital(cycleId: string): Promise<number> {
    const db = createAdminClient();
    const { data: cycleRow, error: cycleError } = await db
      .from("investment_cycles")
      .select("pool_config_snapshot")
      .eq("id", cycleId)
      .maybeSingle();
    if (cycleError) throw new Error(cycleError.message);

    const initialRaised = readCycleInitialRaisedCapital(
      (cycleRow as { pool_config_snapshot?: unknown } | null)?.pool_config_snapshot
    );

    const [allocationRaised, investorCount] = await Promise.all([
      this.sumRaisedCapitalForCycle(cycleId),
      countActiveInvestors(cycleId),
    ]);
    const raisedCapital = initialRaised + allocationRaised;

    const { error } = await db
      .from("investment_cycles")
      .update({
        raised_capital: raisedCapital,
        investor_count: investorCount,
      } as never)
      .eq("id", cycleId);

    if (error) throw new Error(error.message);
    return raisedCapital;
  },

  async enrichCycles(
    cycles: InvestmentCycle[],
    options?: { applyFundRaisedSeed?: boolean }
  ): Promise<InvestmentCycle[]> {
    if (cycles.length === 0) return cycles;

    const applyFundRaisedSeed = options?.applyFundRaisedSeed ?? false;
    const raisedByCycle = await this.sumRaisedCapitalForCycles(cycles.map((cycle) => cycle.id));
    const investorCounts = await Promise.all(
      cycles.map(async (cycle) => [cycle.id, await countActiveInvestors(cycle.id)] as const)
    );
    const investorByCycle = new Map(investorCounts);
    const seedsByFund = applyFundRaisedSeed
      ? await loadFundRaisedCapitalSeeds(
          [...new Set(cycles.map((cycle) => cycle.fundId).filter(Boolean))] as string[]
        )
      : new Map<string, number>();

    return cycles.map((cycle) => {
      const allocationRaised = raisedByCycle.get(cycle.id) ?? 0;
      const initialRaised = readCycleInitialRaisedCapital(cycle.poolConfigSnapshot);
      const liveRaised = initialRaised + allocationRaised;
      const seed = applyFundRaisedSeed && cycle.fundId ? seedsByFund.get(cycle.fundId) ?? 0 : 0;
      const raised = applyFundRaisedSeed ? mergePublicRaisedCapital(seed, liveRaised) : liveRaised;
      const enriched = applyCycleFundingMetrics(cycle, raised);
      return {
        ...enriched,
        investorCount: investorByCycle.get(cycle.id) ?? cycle.investorCount,
      };
    });
  },

  async enrichCycle(cycle: InvestmentCycle | null): Promise<InvestmentCycle | null> {
    if (!cycle) return null;
    const [enriched] = await this.enrichCycles([cycle]);
    return enriched ?? null;
  },
};
