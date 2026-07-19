import type { InvestmentAllocation } from "@/domain/investment/types";

export async function createAllocation(input: {
  investmentCycleId: string;
  amount: number;
}): Promise<InvestmentAllocation> {
  const res = await fetch("/api/investor/investment-allocations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    throw new Error(data.error ?? "Failed to create allocation");
  }
  const data = (await res.json()) as { allocation: InvestmentAllocation };
  return data.allocation;
}

export async function cancelAllocation(id: string): Promise<InvestmentAllocation> {
  const res = await fetch(`/api/investor/investment-allocations/${id}/cancel`, {
    method: "POST",
  });
  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    throw new Error(data.error ?? "Failed to cancel allocation");
  }
  const data = (await res.json()) as { allocation: InvestmentAllocation };
  return data.allocation;
}
