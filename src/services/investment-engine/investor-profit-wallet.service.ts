import { createAdminClient } from "@/lib/supabase/admin";
import type { InvestorProfitWallet } from "@/domain/investment-engine/types";
import { roundMoney } from "@/lib/investment-engine/ownership";

type WalletRow = {
  investor_id: string;
  fund_id: string;
  balance: number | string;
  source_cycle_id?: string | null;
};

const LEGACY_CYCLE_KEY = "00000000-0000-0000-0000-000000000000";

function cycleFilter(sourceCycleId?: string | null) {
  if (sourceCycleId) {
    return { column: "source_cycle_id" as const, value: sourceCycleId };
  }
  return { column: "source_cycle_id" as const, value: null };
}

export const investorProfitWalletService = {
  async getOrCreate(
    investorId: string,
    fundId: string,
    sourceCycleId?: string | null
  ): Promise<InvestorProfitWallet> {
    const db = createAdminClient();
    const filter = cycleFilter(sourceCycleId);
    let query = db
      .from("investor_profit_wallets")
      .select("*")
      .eq("investor_id", investorId)
      .eq("fund_id", fundId);

    query =
      filter.value == null
        ? query.is("source_cycle_id" as never, null)
        : query.eq("source_cycle_id" as never, filter.value);

    const { data: existing } = await query.maybeSingle();

    if (existing) {
      const row = existing as WalletRow;
      return {
        investorId: row.investor_id,
        fundId: row.fund_id,
        balance: roundMoney(Number(row.balance)),
        sourceCycleId: row.source_cycle_id ?? null,
      };
    }

    const { data, error } = await db
      .from("investor_profit_wallets")
      .insert({
        investor_id: investorId,
        fund_id: fundId,
        source_cycle_id: sourceCycleId ?? null,
        balance: 0,
      } as never)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    const row = data as WalletRow;
    return {
      investorId: row.investor_id,
      fundId: row.fund_id,
      balance: 0,
      sourceCycleId: row.source_cycle_id ?? null,
    };
  },

  async credit(
    investorId: string,
    fundId: string,
    amount: number,
    sourceCycleId?: string | null
  ): Promise<InvestorProfitWallet> {
    if (amount <= 0) return this.getOrCreate(investorId, fundId, sourceCycleId);
    const wallet = await this.getOrCreate(investorId, fundId, sourceCycleId);
    const next = roundMoney(wallet.balance + amount);
    const db = createAdminClient();
    let query = db
      .from("investor_profit_wallets")
      .update({ balance: next, updated_at: new Date().toISOString() } as never)
      .eq("investor_id", investorId)
      .eq("fund_id", fundId);

    query =
      sourceCycleId == null
        ? query.is("source_cycle_id" as never, null)
        : query.eq("source_cycle_id" as never, sourceCycleId);

    const { error } = await query;
    if (error) throw new Error(error.message);
    return { investorId, fundId, balance: next, sourceCycleId: sourceCycleId ?? null };
  },

  async debit(
    investorId: string,
    fundId: string,
    amount: number,
    sourceCycleId?: string | null
  ): Promise<InvestorProfitWallet> {
    const wallet = await this.getOrCreate(investorId, fundId, sourceCycleId);
    if (wallet.balance < amount) {
      throw new Error("Insufficient profit wallet balance.");
    }
    const next = roundMoney(wallet.balance - amount);
    const db = createAdminClient();
    let query = db
      .from("investor_profit_wallets")
      .update({ balance: next, updated_at: new Date().toISOString() } as never)
      .eq("investor_id", investorId)
      .eq("fund_id", fundId);

    query =
      sourceCycleId == null
        ? query.is("source_cycle_id" as never, null)
        : query.eq("source_cycle_id" as never, sourceCycleId);

    const { error } = await query;
    if (error) throw new Error(error.message);
    return { investorId, fundId, balance: next, sourceCycleId: sourceCycleId ?? null };
  },

  async listForInvestor(investorId: string): Promise<InvestorProfitWallet[]> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("investor_profit_wallets")
      .select("*")
      .eq("investor_id", investorId);
    if (error) throw new Error(error.message);
    return ((data ?? []) as WalletRow[]).map((row) => ({
      investorId: row.investor_id,
      fundId: row.fund_id,
      balance: roundMoney(Number(row.balance)),
      sourceCycleId: row.source_cycle_id ?? null,
    }));
  },

  async getTotalBalanceForFund(investorId: string, fundId: string): Promise<number> {
    const wallets = await this.listForInvestor(investorId);
    return roundMoney(
      wallets.filter((wallet) => wallet.fundId === fundId).reduce((sum, wallet) => sum + wallet.balance, 0)
    );
  },

  async listForFund(fundId: string): Promise<InvestorProfitWallet[]> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("investor_profit_wallets")
      .select("*")
      .eq("fund_id", fundId);
    if (error) throw new Error(error.message);
    return ((data ?? []) as WalletRow[]).map((row) => ({
      investorId: row.investor_id,
      fundId: row.fund_id,
      balance: roundMoney(Number(row.balance)),
      sourceCycleId: row.source_cycle_id ?? null,
    }));
  },
};

export { LEGACY_CYCLE_KEY };
