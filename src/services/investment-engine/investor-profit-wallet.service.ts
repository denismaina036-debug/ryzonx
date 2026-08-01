import { createAdminClient } from "@/lib/supabase/admin";
import type { InvestorProfitWallet } from "@/domain/investment-engine/types";
import { roundMoney } from "@/lib/investment-engine/ownership";

type WalletRow = {
  investor_id: string;
  fund_id: string;
  balance: number | string;
};

export const investorProfitWalletService = {
  async getOrCreate(investorId: string, fundId: string): Promise<InvestorProfitWallet> {
    const db = createAdminClient();
    const { data: existing } = await db
      .from("investor_profit_wallets")
      .select("*")
      .eq("investor_id", investorId)
      .eq("fund_id", fundId)
      .maybeSingle();

    if (existing) {
      const row = existing as WalletRow;
      return {
        investorId: row.investor_id,
        fundId: row.fund_id,
        balance: roundMoney(Number(row.balance)),
      };
    }

    const { data, error } = await db
      .from("investor_profit_wallets")
      .insert({ investor_id: investorId, fund_id: fundId, balance: 0 } as never)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    const row = data as WalletRow;
    return {
      investorId: row.investor_id,
      fundId: row.fund_id,
      balance: 0,
    };
  },

  async credit(investorId: string, fundId: string, amount: number): Promise<InvestorProfitWallet> {
    if (amount <= 0) return this.getOrCreate(investorId, fundId);
    const wallet = await this.getOrCreate(investorId, fundId);
    const next = roundMoney(wallet.balance + amount);
    const db = createAdminClient();
    const { error } = await db
      .from("investor_profit_wallets")
      .update({ balance: next, updated_at: new Date().toISOString() } as never)
      .eq("investor_id", investorId)
      .eq("fund_id", fundId);
    if (error) throw new Error(error.message);
    return { investorId, fundId, balance: next };
  },

  async debit(investorId: string, fundId: string, amount: number): Promise<InvestorProfitWallet> {
    const wallet = await this.getOrCreate(investorId, fundId);
    if (wallet.balance < amount) {
      throw new Error("Insufficient profit wallet balance.");
    }
    const next = roundMoney(wallet.balance - amount);
    const db = createAdminClient();
    const { error } = await db
      .from("investor_profit_wallets")
      .update({ balance: next, updated_at: new Date().toISOString() } as never)
      .eq("investor_id", investorId)
      .eq("fund_id", fundId);
    if (error) throw new Error(error.message);
    return { investorId, fundId, balance: next };
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
    }));
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
    }));
  },
};
