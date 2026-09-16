import { createAdminClient } from "@/lib/supabase/admin";
import type { CycleOwnershipSnapshot } from "@/domain/investment-engine/types";
import { computeOwnershipPct, roundMoney } from "@/lib/investment-engine/ownership";

type AllocationCapitalRow = {
  investor_id: string;
  amount: number | string;
};

type SnapshotRow = {
  id: string;
  investment_cycle_id: string;
  fund_id: string;
  investor_id: string | null;
  is_virtual: boolean;
  virtual_label: string | null;
  capital: number | string;
  ownership_pct: number | string;
  pool_capital_total: number | string;
  snapshot_at: string;
};

function mapSnapshot(row: SnapshotRow): CycleOwnershipSnapshot {
  return {
    id: row.id,
    investmentCycleId: row.investment_cycle_id,
    fundId: row.fund_id,
    investorId: row.investor_id,
    isVirtual: row.is_virtual,
    virtualLabel: row.virtual_label,
    capital: roundMoney(Number(row.capital)),
    ownershipPct: Number(row.ownership_pct),
    poolCapitalTotal: roundMoney(Number(row.pool_capital_total)),
    snapshotAt: row.snapshot_at,
  };
}

export const cycleOwnershipService = {
  async captureSnapshot(cycleId: string, fundId: string): Promise<CycleOwnershipSnapshot[]> {
    const db = createAdminClient();
    const { data: allocations, error: allocationsError } = await db
      .from("investment_allocations")
      .select("investor_id, amount")
      .eq("investment_cycle_id", cycleId)
      .in("status", ["funding_confirmed", "confirmed", "settled", "locked", "distributed"]);
    if (allocationsError) throw new Error(allocationsError.message);

    const capitalByInvestor = new Map<string, number>();
    for (const allocation of (allocations ?? []) as AllocationCapitalRow[]) {
      const next = roundMoney(
        (capitalByInvestor.get(allocation.investor_id) ?? 0) + Number(allocation.amount)
      );
      capitalByInvestor.set(allocation.investor_id, next);
    }

    const positions = [...capitalByInvestor.entries()]
      .filter(([, capital]) => capital > 0)
      .map(([investorId, capital]) => ({ investorId, capital }));
    const poolTotal = roundMoney(positions.reduce((sum, position) => sum + position.capital, 0));
    if (poolTotal <= 0) {
      throw new Error("Cannot capture ownership snapshot without eligible cycle allocations.");
    }

    await db.from("cycle_ownership_snapshots").delete().eq("investment_cycle_id", cycleId);

    const rows = positions.map((position) => ({
      investment_cycle_id: cycleId,
      fund_id: fundId,
      investor_id: position.investorId,
      is_virtual: false,
      virtual_label: null,
      capital: position.capital,
      ownership_pct: computeOwnershipPct(position.capital, poolTotal),
      pool_capital_total: poolTotal,
    }));

    const { data, error } = await db
      .from("cycle_ownership_snapshots")
      .insert(rows as never)
      .select("*");
    if (error) throw new Error(error.message);
    return ((data ?? []) as SnapshotRow[]).map(mapSnapshot);
  },

  async getSnapshot(cycleId: string): Promise<CycleOwnershipSnapshot[]> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("cycle_ownership_snapshots")
      .select("*")
      .eq("investment_cycle_id", cycleId);
    if (error) throw new Error(error.message);
    return ((data ?? []) as SnapshotRow[]).map(mapSnapshot);
  },

  async hasSnapshot(cycleId: string): Promise<boolean> {
    const snapshots = await this.getSnapshot(cycleId);
    return snapshots.length > 0;
  },
};
