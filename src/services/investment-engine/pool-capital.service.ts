import { createAdminClient } from "@/lib/supabase/admin";
import type { PoolInvestorPosition } from "@/domain/investment-engine/types";
import { computeOwnershipPct, roundMoney } from "@/lib/investment-engine/ownership";

type PositionRow = {
  id: string;
  fund_id: string;
  investor_id: string | null;
  is_virtual: boolean;
  virtual_label: string | null;
  capital: number | string;
};

function mapPosition(row: PositionRow): PoolInvestorPosition {
  return {
    id: row.id,
    fundId: row.fund_id,
    investorId: row.investor_id,
    isVirtual: row.is_virtual,
    virtualLabel: row.virtual_label,
    capital: roundMoney(Number(row.capital)),
  };
}

export const poolCapitalService = {
  async listPositions(fundId: string): Promise<PoolInvestorPosition[]> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("pool_investor_positions")
      .select("*")
      .eq("fund_id", fundId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as PositionRow[]).map(mapPosition);
  },

  async getPoolCapitalTotal(fundId: string): Promise<number> {
    const positions = await this.listPositions(fundId);
    return roundMoney(positions.reduce((s, p) => s + p.capital, 0));
  },

  async syncFundInvestorCapital(fundId: string): Promise<number> {
    const total = await this.getPoolCapitalTotal(fundId);
    const db = createAdminClient();
    const { error } = await db
      .from("funds")
      .update({ investor_capital: total, updated_at: new Date().toISOString() } as never)
      .eq("id", fundId);
    if (error) throw new Error(error.message);
    return total;
  },

  async upsertRealInvestorCapital(
    fundId: string,
    investorId: string,
    delta: number
  ): Promise<PoolInvestorPosition> {
    const db = createAdminClient();
    const { data: existing } = await db
      .from("pool_investor_positions")
      .select("*")
      .eq("fund_id", fundId)
      .eq("investor_id", investorId)
      .eq("is_virtual", false)
      .maybeSingle();

    const current = existing ? roundMoney(Number((existing as PositionRow).capital)) : 0;
    const next = roundMoney(Math.max(0, current + delta));
    if (next === 0 && !existing) {
      throw new Error("Cannot create zero-capital position.");
    }

    if (existing) {
      if (next === 0) {
        const { error } = await db.from("pool_investor_positions").delete().eq("id", (existing as PositionRow).id);
        if (error) throw new Error(error.message);
        await this.syncFundInvestorCapital(fundId);
        return {
          id: (existing as PositionRow).id,
          fundId,
          investorId,
          isVirtual: false,
          virtualLabel: null,
          capital: 0,
        };
      }
      const { data, error } = await db
        .from("pool_investor_positions")
        .update({ capital: next, updated_at: new Date().toISOString() } as never)
        .eq("id", (existing as PositionRow).id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      await this.syncFundInvestorCapital(fundId);
      return mapPosition(data as PositionRow);
    }

    const { data, error } = await db
      .from("pool_investor_positions")
      .insert({
        fund_id: fundId,
        investor_id: investorId,
        is_virtual: false,
        capital: next,
      } as never)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await this.syncFundInvestorCapital(fundId);
    return mapPosition(data as PositionRow);
  },

  async applyInvestment(fundId: string, investorId: string, amount: number): Promise<void> {
    if (amount <= 0) throw new Error("Investment amount must be positive.");
    await this.upsertRealInvestorCapital(fundId, investorId, amount);
  },

  async applyWithdrawal(fundId: string, investorId: string, amount: number): Promise<void> {
    if (amount <= 0) throw new Error("Withdrawal amount must be positive.");
    const positions = await this.listPositions(fundId);
    const position = positions.find((p) => !p.isVirtual && p.investorId === investorId);
    if (!position || position.capital < amount) {
      throw new Error("Insufficient pool capital for withdrawal.");
    }
    await this.upsertRealInvestorCapital(fundId, investorId, -amount);
  },

  async applyReinvestment(fundId: string, investorId: string, amount: number): Promise<void> {
    await this.applyInvestment(fundId, investorId, amount);
  },

  getOwnershipMap(positions: PoolInvestorPosition[]): Map<string, number> {
    const total = roundMoney(positions.reduce((s, p) => s + p.capital, 0));
    const map = new Map<string, number>();
    for (const p of positions) {
      const key = p.isVirtual ? `virtual:${p.virtualLabel}` : p.investorId!;
      map.set(key, computeOwnershipPct(p.capital, total));
    }
    return map;
  },
};
