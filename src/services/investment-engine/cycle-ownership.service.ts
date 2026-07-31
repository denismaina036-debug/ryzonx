import { createAdminClient } from "@/lib/supabase/admin";
import type { CycleOwnershipSnapshot } from "@/domain/investment-engine/types";
import { computeOwnershipPct, roundMoney } from "@/lib/investment-engine/ownership";
import { poolCapitalService } from "./pool-capital.service";

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
    const positions = await poolCapitalService.listPositions(fundId);
    const poolTotal = roundMoney(positions.reduce((s, p) => s + p.capital, 0));
    if (poolTotal <= 0) {
      throw new Error("Cannot capture ownership snapshot with zero pool capital.");
    }

    const db = createAdminClient();
    await db.from("cycle_ownership_snapshots").delete().eq("investment_cycle_id", cycleId);

    const rows = positions.map((p) => ({
      investment_cycle_id: cycleId,
      fund_id: fundId,
      investor_id: p.investorId,
      is_virtual: p.isVirtual,
      virtual_label: p.virtualLabel,
      capital: p.capital,
      ownership_pct: computeOwnershipPct(p.capital, poolTotal),
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
