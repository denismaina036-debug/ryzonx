import { createAdminClient } from "@/lib/supabase/admin";
import type { InvestmentQueueItem, InvestmentQueueType } from "@/domain/investment-engine/types";
import { poolCapitalService } from "./pool-capital.service";
import { investorProfitWalletService } from "./investor-profit-wallet.service";

type QueueRow = {
  id: string;
  fund_id: string;
  investor_id: string;
  queue_type: InvestmentQueueType;
  amount: number | string;
  status: "pending" | "processed" | "cancelled";
  target_cycle_id: string | null;
  source_settlement_id: string | null;
  notes: string | null;
  processed_at: string | null;
  created_at: string;
};

function mapQueue(row: QueueRow): InvestmentQueueItem {
  return {
    id: row.id,
    fundId: row.fund_id,
    investorId: row.investor_id,
    queueType: row.queue_type,
    amount: Number(row.amount),
    status: row.status,
    targetCycleId: row.target_cycle_id,
    sourceSettlementId: row.source_settlement_id,
    notes: row.notes,
    processedAt: row.processed_at,
    createdAt: row.created_at,
  };
}

export const investmentQueueService = {
  async enqueue(params: {
    fundId: string;
    investorId: string;
    queueType: InvestmentQueueType;
    amount: number;
    targetCycleId?: string | null;
    sourceSettlementId?: string | null;
    notes?: string | null;
  }): Promise<InvestmentQueueItem> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("investment_queue")
      .insert({
        fund_id: params.fundId,
        investor_id: params.investorId,
        queue_type: params.queueType,
        amount: params.amount,
        target_cycle_id: params.targetCycleId ?? null,
        source_settlement_id: params.sourceSettlementId ?? null,
        notes: params.notes ?? null,
      } as never)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapQueue(data as QueueRow);
  },

  async enqueueReinvestment(params: {
    fundId: string;
    investorId: string;
    amount: number;
    targetCycleId?: string | null;
  }): Promise<InvestmentQueueItem> {
    await investorProfitWalletService.debit(params.investorId, params.fundId, params.amount);
    return this.enqueue({
      ...params,
      queueType: "reinvestment",
      notes: "Profit reinvestment",
    });
  },

  async listPending(fundId: string): Promise<InvestmentQueueItem[]> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("investment_queue")
      .select("*")
      .eq("fund_id", fundId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as QueueRow[]).map(mapQueue);
  },

  async processPendingForFund(fundId: string): Promise<{ processed: number }> {
    const pending = await this.listPending(fundId);
    let processed = 0;
    for (const item of pending) {
      await this.processItem(item);
      processed += 1;
    }
    await poolCapitalService.syncFundInvestorCapital(fundId);
    return { processed };
  },

  async processItem(item: InvestmentQueueItem): Promise<void> {
    if (item.status !== "pending") return;

    switch (item.queueType) {
      case "investment":
        await poolCapitalService.applyInvestment(item.fundId, item.investorId, item.amount);
        break;
      case "withdrawal":
        await poolCapitalService.applyWithdrawal(item.fundId, item.investorId, item.amount);
        break;
      case "reinvestment":
        await poolCapitalService.applyReinvestment(item.fundId, item.investorId, item.amount);
        break;
    }

    const db = createAdminClient();
    const { error } = await db
      .from("investment_queue")
      .update({
        status: "processed",
        processed_at: new Date().toISOString(),
      } as never)
      .eq("id", item.id);
    if (error) throw new Error(error.message);
  },
};
