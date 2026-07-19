"use client";

import type { InvestmentAllocation, InvestmentCycle, Strategy } from "@/domain/investment/types";
import type { InvestmentCycleStatus } from "@/constants/investment-cycle";
import type { StrategyStatus } from "@/constants/strategy";

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export async function fetchStrategies(): Promise<Strategy[]> {
  const data = await parseJson<{ strategies: Strategy[] }>(
    await fetch("/api/pool-manager/strategies")
  );
  return data.strategies;
}

export async function fetchStrategy(id: string): Promise<Strategy> {
  const data = await parseJson<{ strategy: Strategy }>(
    await fetch(`/api/pool-manager/strategies/${id}`)
  );
  return data.strategy;
}

export async function createStrategy(body: Record<string, unknown>): Promise<Strategy> {
  const data = await parseJson<{ strategy: Strategy }>(
    await fetch("/api/pool-manager/strategies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
  return data.strategy;
}

export async function updateStrategy(
  id: string,
  body: Record<string, unknown>
): Promise<Strategy> {
  const data = await parseJson<{ strategy: Strategy }>(
    await fetch(`/api/pool-manager/strategies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
  return data.strategy;
}

export async function submitStrategy(id: string): Promise<Strategy> {
  const data = await parseJson<{ strategy: Strategy }>(
    await fetch(`/api/pool-manager/strategies/${id}/submit`, { method: "POST" })
  );
  return data.strategy;
}

export async function transitionStrategy(
  id: string,
  status: StrategyStatus
): Promise<Strategy> {
  const data = await parseJson<{ strategy: Strategy }>(
    await fetch(`/api/pool-manager/strategies/${id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
  );
  return data.strategy;
}

export async function fetchCycles(strategyId?: string): Promise<InvestmentCycle[]> {
  const url = strategyId
    ? `/api/pool-manager/investment-cycles?strategyId=${strategyId}`
    : "/api/pool-manager/investment-cycles";
  const data = await parseJson<{ cycles: InvestmentCycle[] }>(await fetch(url));
  return data.cycles;
}

export async function fetchCycle(id: string): Promise<InvestmentCycle> {
  const data = await parseJson<{ cycle: InvestmentCycle }>(
    await fetch(`/api/pool-manager/investment-cycles/${id}`)
  );
  return data.cycle;
}

export async function createCycle(body: Record<string, unknown>): Promise<InvestmentCycle> {
  const data = await parseJson<{ cycle: InvestmentCycle }>(
    await fetch("/api/pool-manager/investment-cycles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
  return data.cycle;
}

export async function updateCycle(
  id: string,
  body: Record<string, unknown>
): Promise<InvestmentCycle> {
  const data = await parseJson<{ cycle: InvestmentCycle }>(
    await fetch(`/api/pool-manager/investment-cycles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
  return data.cycle;
}

export async function submitCycle(id: string): Promise<InvestmentCycle> {
  const data = await parseJson<{ cycle: InvestmentCycle }>(
    await fetch(`/api/pool-manager/investment-cycles/${id}/submit`, { method: "POST" })
  );
  return data.cycle;
}

export async function transitionCycle(
  id: string,
  status: InvestmentCycleStatus
): Promise<InvestmentCycle> {
  const data = await parseJson<{ cycle: InvestmentCycle }>(
    await fetch(`/api/pool-manager/investment-cycles/${id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
  );
  return data.cycle;
}

export async function fetchCycleAllocations(cycleId: string): Promise<InvestmentAllocation[]> {
  const data = await parseJson<{ allocations: InvestmentAllocation[] }>(
    await fetch(`/api/pool-manager/investment-cycles/${cycleId}/allocations`)
  );
  return data.allocations;
}
