import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/session";
import { userOwnsPoolManager } from "@/lib/auth/pool-manager-access";
import { USER_ROLES } from "@/constants/roles";
import type { CycleParticipantView } from "@/domain/investment/types";
import { investmentCycleService } from "@/services/investment-cycle.service";
import { investmentAllocationService } from "@/services/investment-allocation.service";
import { profitDistributionService } from "@/services/profit-distribution.service";

export interface CycleLiveMetrics {
  cycleId: string;
  currentCapital: number;
  currentCycleProfit: number;
  tradesRecorded: number;
  participants: Array<CycleParticipantView & { projectedProfit: number }>;
}

export interface CycleLiveSummary {
  cycleId: string;
  currentCapital: number;
  currentCycleProfit: number;
  tradesRecorded: number;
}

export interface InvestorLiveTradingMetrics {
  currentCycleProfit: number;
  tradesRecorded: number;
  investorInvestment: number | null;
  investorOwnershipPct: number | null;
  investorProjectedProfit: number | null;
}

async function countTradesForCycle(cycleId: string): Promise<number> {
  const db = createAdminClient();
  const { count, error } = await db
    .from("trade_entries")
    .select("id", { count: "exact", head: true })
    .eq("investment_cycle_id", cycleId)
    .neq("status", "draft");

  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function countTradesForCycles(cycleIds: string[]): Promise<Map<string, number>> {
  const totals = new Map<string, number>();
  if (cycleIds.length === 0) return totals;

  const db = createAdminClient();
  const { data, error } = await db
    .from("trade_entries")
    .select("investment_cycle_id")
    .in("investment_cycle_id", cycleIds)
    .neq("status", "draft");

  if (error) throw new Error(error.message);

  for (const row of (data ?? []) as Array<{ investment_cycle_id: string }>) {
    const cycleId = row.investment_cycle_id;
    totals.set(cycleId, (totals.get(cycleId) ?? 0) + 1);
  }
  return totals;
}

export const cycleLiveMetricsService = {
  async getForPoolManager(cycleId: string): Promise<CycleLiveMetrics> {
    const user = await requireAuth();
    const cycle = await investmentCycleService.getByIdForManager(cycleId);

    const isAdmin = user.role === USER_ROLES.ADMINISTRATOR;
    if (!isAdmin && !(await userOwnsPoolManager(user.id, cycle.poolManagerId))) {
      throw new Error("Insufficient permissions");
    }

    const [participants, tradesRecorded, projections] = await Promise.all([
      investmentAllocationService.listParticipantsByCycle(cycleId),
      countTradesForCycle(cycleId),
      profitDistributionService.projectInvestorProfitForCycle(
        cycleId,
        cycle.currentCycleProfit
      ),
    ]);

    return {
      cycleId: cycle.id,
      currentCapital: cycle.raisedCapital,
      currentCycleProfit: cycle.currentCycleProfit,
      tradesRecorded,
      participants: participants.map((participant) => {
        const projection = projections.find(
          (row) => row.allocationId === participant.id
        );
        return {
          ...participant,
          projectedProfit: projection?.projectedProfit ?? 0,
        };
      }),
    };
  },

  async getSummariesForPoolManager(cycleIds: string[]): Promise<CycleLiveSummary[]> {
    if (cycleIds.length === 0) return [];

    const user = await requireAuth();
    const cycles = await Promise.all(
      cycleIds.map((id) => investmentCycleService.getByIdForManager(id))
    );

    for (const cycle of cycles) {
      const isAdmin = user.role === USER_ROLES.ADMINISTRATOR;
      if (!isAdmin && !(await userOwnsPoolManager(user.id, cycle.poolManagerId))) {
        throw new Error("Insufficient permissions");
      }
    }

    const tradeCounts = await countTradesForCycles(cycleIds);

    return cycles.map((cycle) => ({
      cycleId: cycle.id,
      currentCapital: cycle.raisedCapital,
      currentCycleProfit: cycle.currentCycleProfit,
      tradesRecorded: tradeCounts.get(cycle.id) ?? 0,
    }));
  },

  async getInvestorLiveTrading(cycleId: string, investorUserId: string): Promise<InvestorLiveTradingMetrics> {
    const cycle = await investmentCycleService.getById(cycleId);
    if (!cycle) throw new Error("Cycle not found.");

    const [tradesRecorded, allocations] = await Promise.all([
      countTradesForCycle(cycleId),
      investmentAllocationService.listByCycleInternal(cycleId),
    ]);

    const investorAllocation = allocations.find(
      (row) =>
        row.investorId === investorUserId &&
        row.status !== "cancelled" &&
        row.status !== "rejected"
    );

    const poolTotal =
      cycle.raisedCapital > 0
        ? cycle.raisedCapital
        : allocations
            .filter((row) => row.status !== "cancelled" && row.status !== "rejected")
            .reduce((sum, row) => sum + row.amount, 0);

    const investorInvestment = investorAllocation?.amount ?? null;
    const investorOwnershipPct =
      investorInvestment != null && poolTotal > 0
        ? Math.round((investorInvestment / poolTotal) * 10000) / 100
        : null;
    const projections = await profitDistributionService.projectInvestorProfitForCycle(
      cycleId,
      cycle.currentCycleProfit
    );
    const investorProjectedProfit = investorAllocation
      ? projections.find((row) => row.allocationId === investorAllocation.id)?.projectedProfit ?? 0
      : null;

    return {
      currentCycleProfit: cycle.currentCycleProfit,
      tradesRecorded,
      investorInvestment,
      investorOwnershipPct,
      investorProjectedProfit,
    };
  },
};
