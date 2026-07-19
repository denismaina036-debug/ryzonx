import type { StrategyStatus } from "@/constants/strategy";
import type { InvestmentCycleStatus } from "@/constants/investment-cycle";
import type { Strategy, InvestmentCycle, InvestmentAllocation } from "@/domain/investment/types";

export async function adminTransitionStrategy(
  id: string,
  status: StrategyStatus,
  reviewNote?: string
): Promise<Strategy> {
  const res = await fetch(`/api/admin/strategies/${id}/transition`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, reviewNote }),
  });
  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    throw new Error(data.error ?? "Strategy transition failed");
  }
  const data = (await res.json()) as { strategy: Strategy };
  return data.strategy;
}

export async function adminTransitionCycle(
  id: string,
  status: InvestmentCycleStatus,
  reviewNote?: string
): Promise<InvestmentCycle> {
  const res = await fetch(`/api/admin/investment-cycles/${id}/transition`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, reviewNote }),
  });
  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    throw new Error(data.error ?? "Cycle transition failed");
  }
  const data = (await res.json()) as { cycle: InvestmentCycle };
  return data.cycle;
}

export async function fetchCycleAllocations(cycleId: string): Promise<InvestmentAllocation[]> {
  const res = await fetch(`/api/admin/investment-allocations?cycleId=${encodeURIComponent(cycleId)}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { allocations: InvestmentAllocation[] };
  return data.allocations ?? [];
}
