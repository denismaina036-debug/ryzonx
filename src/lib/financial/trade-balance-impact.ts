import { createAdminClient } from "@/lib/supabase/admin";
import { RAISED_CAPITAL_ALLOCATION_STATUSES } from "@/domain/investment/cycle-metrics";
import { investmentCycleMetricsService } from "@/services/investment-cycle-metrics.service";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

export type CycleAllocationRow = {
  id: string;
  investorId: string;
  amount: number;
};

/** Cycle allocations must come from explicit investor actions — never auto-sync portfolios. */
export async function ensureCycleInvestorAllocations(_cycleId: string): Promise<void> {
  return;
}

export async function loadCycleAllocations(cycleId: string): Promise<CycleAllocationRow[]> {
  await ensureCycleInvestorAllocations(cycleId);

  const db = createAdminClient();
  const { data: allocationRows, error } = await db
    .from("investment_allocations")
    .select("id, investor_id, amount")
    .eq("investment_cycle_id", cycleId)
    .in(
      "status",
      RAISED_CAPITAL_ALLOCATION_STATUSES as unknown as readonly (
        | "pending"
        | "funding_confirmed"
        | "confirmed"
        | "settled"
        | "locked"
        | "distributed"
        | "cancelled"
      )[]
    );

  if (error) throw new Error(error.message);

  return ((allocationRows ?? []) as Array<{
    id: string;
    investor_id: string;
    amount: string | number;
  }>).map((row) => ({
    id: row.id,
    investorId: row.investor_id,
    amount: toNumber(row.amount),
  }));
}

export async function resolveFundIdForCycle(cycleId: string): Promise<string | null> {
  const db = createAdminClient();
  const { data: cycleRow } = await db
    .from("investment_cycles")
    .select("fund_id")
    .eq("id", cycleId)
    .maybeSingle();
  return (cycleRow as { fund_id?: string | null } | null)?.fund_id ?? null;
}

/** Mirror investor portfolio balances when cycle allocation amounts change. */
export async function applyInvestorPortfolioDelta(input: {
  fundId: string;
  investorId: string;
  delta: number;
}): Promise<void> {
  const { fundId, investorId, delta } = input;
  if (delta === 0) return;

  const db = createAdminClient();
  const { data: portfolio, error } = await db
    .from("investor_portfolios")
    .select("total_invested, current_value, realized_pnl")
    .eq("fund_id", fundId)
    .eq("user_id", investorId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!portfolio) return;

  const row = portfolio as {
    total_invested?: number;
    current_value?: number;
    realized_pnl?: number;
  };

  await db
    .from("investor_portfolios")
    .update({
      total_invested: roundMoney(Math.max(0, toNumber(row.total_invested) + delta)),
      current_value: roundMoney(Math.max(0, toNumber(row.current_value) + delta)),
      realized_pnl: roundMoney(toNumber(row.realized_pnl) + delta),
      updated_at: new Date().toISOString(),
    } as never)
    .eq("fund_id", fundId)
    .eq("user_id", investorId);
}

export function distributeProRataAmount(
  totalAmount: number,
  allocations: CycleAllocationRow[],
  mode: "credit" | "debit"
): Array<{
  allocationId: string;
  investorId: string;
  share: number;
  ownershipPct: number;
  previousAmount: number;
  newAmount: number;
}> {
  const poolTotal = roundMoney(allocations.reduce((s, a) => s + a.amount, 0));
  if (poolTotal <= 0 || totalAmount <= 0) return [];

  let allocated = 0;
  return allocations.map((alloc, index) => {
    const ownershipPct = alloc.amount / poolTotal;
    let share: number;
    if (index === allocations.length - 1) {
      share = roundMoney(totalAmount - allocated);
    } else {
      share = roundMoney(totalAmount * ownershipPct);
      allocated += share;
    }

    const newAmount =
      mode === "credit"
        ? roundMoney(alloc.amount + share)
        : roundMoney(Math.max(0, alloc.amount - share));

    return {
      allocationId: alloc.id,
      investorId: alloc.investorId,
      share,
      ownershipPct: roundMoney(ownershipPct * 1_000_000) / 1_000_000,
      previousAmount: alloc.amount,
      newAmount,
    };
  });
}
