import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { FINANCIAL_AUDIT_ACTIONS } from "@/constants/ledger";
import { generateLedgerReference } from "@/lib/financial/ledger-utils";
import { assertCycleAllowsDistribution, assertPositiveAmount } from "@/lib/financial/allocation-rules";
import { auditService } from "@/services/audit.service";
import { ledgerService } from "@/services/ledger.service";
import { ledgerAccountService } from "@/services/ledger-account.service";
import { investmentCycleService } from "@/services/investment-cycle.service";
import { publishPlatformEvent, PLATFORM_EVENT_TYPES } from "@/lib/platform-events/publish";
import { resolveCycleManagerUserId } from "@/lib/platform-events/resolve-recipients";
import type { DistributionRecord } from "@/domain/financial/types";
import type { DistributionRecordStatus } from "@/constants/ledger";

type RecordRow = {
  id: string;
  distribution_batch_id: string | null;
  investment_cycle_id: string;
  investment_allocation_id: string;
  investor_id: string;
  amount: string | number;
  currency: string;
  status: DistributionRecordStatus;
  ledger_transaction_id: string | null;
  notes: string | null;
  created_by: string | null;
  approved_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapRecord(row: RecordRow): DistributionRecord {
  return {
    id: row.id,
    distributionBatchId: row.distribution_batch_id,
    investmentCycleId: row.investment_cycle_id,
    investmentAllocationId: row.investment_allocation_id,
    investorId: row.investor_id,
    amount: typeof row.amount === "number" ? row.amount : Number(row.amount),
    currency: row.currency,
    status: row.status,
    ledgerTransactionId: row.ledger_transaction_id,
    notes: row.notes,
    createdBy: row.created_by,
    approvedBy: row.approved_by,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const distributionService = {
  async prepareForCycle(
    cycleId: string,
    actorId: string,
    distributionBatchId?: string
  ): Promise<DistributionRecord[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const cycle = await investmentCycleService.getById(cycleId);
    if (!cycle) throw new Error("Cycle not found.");
    assertCycleAllowsDistribution(cycle.status);

    const db = createAdminClient();
    const { data: allocations } = await db
      .from("investment_allocations")
      .select("id, investor_id, amount, currency")
      .eq("investment_cycle_id", cycleId)
      .in("status", ["settled", "locked"]);

    const rows = (allocations ?? []) as Array<{
      id: string;
      investor_id: string;
      amount: number;
      currency: string;
    }>;
    if (rows.length === 0) throw new Error("No settled allocations for distribution.");

    const batchId = distributionBatchId ?? generateLedgerReference("DST");
    const records: DistributionRecord[] = [];

    for (const alloc of rows) {
      const amount = Number(alloc.amount);
      assertPositiveAmount(amount);

      const { data, error } = await db
        .from("distribution_records")
        .insert({
          distribution_batch_id: batchId,
          investment_cycle_id: cycleId,
          investment_allocation_id: alloc.id,
          investor_id: alloc.investor_id,
          amount,
          currency: alloc.currency ?? "USD",
          status: "preparation",
          created_by: actorId,
        } as never)
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      records.push(mapRecord(data as RecordRow));
    }

    await auditService.log({
      actorId,
      action: FINANCIAL_AUDIT_ACTIONS.DISTRIBUTION_PREPARED,
      entityType: "investment_cycle",
      entityId: cycleId,
      newValues: { recordCount: records.length, batchId },
    });

    const poolManagerUserId = await resolveCycleManagerUserId(cycleId);
    publishPlatformEvent({
      eventType: PLATFORM_EVENT_TYPES.DISTRIBUTION_PREPARED,
      category: "financial",
      entityType: "investment_cycle",
      entityId: cycleId,
      actorId,
      payload: {
        poolManagerUserId,
        cycleId,
        cycleName: cycle.name,
        recordCount: records.length,
        batchId,
        summary: `Distribution prepared for ${cycle.name}`,
      },
    });

    return records;
  },

  async advanceStatus(
    recordId: string,
    status: DistributionRecordStatus,
    actorId: string
  ): Promise<DistributionRecord> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data, error } = await db
      .from("distribution_records")
      .update({ status } as never)
      .eq("id", recordId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const record = mapRecord(data as RecordRow);

    if (status === "approved") {
      await auditService.log({
        actorId,
        action: FINANCIAL_AUDIT_ACTIONS.DISTRIBUTION_APPROVED,
        entityType: "distribution_record",
        entityId: recordId,
        newValues: { status },
      });
    }

    return record;
  },

  async completeRecord(recordId: string, actorId: string): Promise<DistributionRecord> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data: row, error: fetchError } = await db
      .from("distribution_records")
      .select("*")
      .eq("id", recordId)
      .maybeSingle();
    if (fetchError || !row) throw new Error("Distribution record not found.");

    const record = mapRecord(row as RecordRow);
    if (!["approved", "pending", "batch"].includes(record.status)) {
      throw new Error("Distribution record is not approved for completion.");
    }

    const cycle = await investmentCycleService.getById(record.investmentCycleId);
    if (!cycle) throw new Error("Cycle not found.");

    const cycleAccounts = await ledgerAccountService.ensureCycleAccounts(cycle.id, cycle.name);
    const investorAccounts = await ledgerAccountService.ensureInvestorAccounts(record.investorId);

    const { transaction } = await ledgerService.postTransaction({
      description: `Distribution to investor for cycle ${cycle.name}`,
      transactionType: "distribution",
      sourceType: "distribution_record",
      sourceId: recordId,
      actorId,
      entries: [
        { accountId: cycleAccounts.escrow.id, entrySide: "debit", amount: record.amount, memo: "Distribution out" },
        { accountId: investorAccounts.available.id, entrySide: "credit", amount: record.amount, memo: "Investor credit" },
      ],
    });

    const { data, error } = await db
      .from("distribution_records")
      .update({
        status: "completed",
        ledger_transaction_id: transaction.id,
        approved_by: actorId,
        completed_at: new Date().toISOString(),
      } as never)
      .eq("id", recordId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    await db
      .from("investment_allocations")
      .update({ status: "distributed" } as never)
      .eq("id", record.investmentAllocationId);

    await auditService.log({
      actorId,
      action: FINANCIAL_AUDIT_ACTIONS.DISTRIBUTION_COMPLETED,
      entityType: "distribution_record",
      entityId: recordId,
      newValues: { amount: record.amount, ledgerTransactionId: transaction.id },
    });

    publishPlatformEvent({
      eventType: PLATFORM_EVENT_TYPES.DISTRIBUTION_COMPLETED,
      category: "financial",
      entityType: "distribution_record",
      entityId: recordId,
      actorId,
      payload: {
        investorId: record.investorId,
        amount: record.amount,
        cycleId: record.investmentCycleId,
        cycleName: cycle.name,
        summary: `Distribution of ${record.amount} completed for ${cycle.name}`,
      },
    });

    return mapRecord(data as RecordRow);
  },

  async listPending(): Promise<DistributionRecord[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data, error } = await db
      .from("distribution_records")
      .select("*")
      .in("status", ["preparation", "batch", "pending", "approved"])
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return ((data ?? []) as RecordRow[]).map(mapRecord);
  },

  async listForCycle(cycleId: string): Promise<DistributionRecord[]> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("distribution_records")
      .select("*")
      .eq("investment_cycle_id", cycleId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return ((data ?? []) as RecordRow[]).map(mapRecord);
  },

  async listForInvestor(investorId: string): Promise<DistributionRecord[]> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("distribution_records")
      .select("*")
      .eq("investor_id", investorId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return ((data ?? []) as RecordRow[]).map(mapRecord);
  },
};
