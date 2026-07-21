import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { FINANCIAL_AUDIT_ACTIONS } from "@/constants/ledger";
import { generateLedgerReference } from "@/lib/financial/ledger-utils";
import {
  assertAllocationTransition,
  assertCycleAllowsFundingConfirmation,
  assertCycleAllowsSettlement,
  assertPositiveAmount,
} from "@/lib/financial/allocation-rules";
import { auditService } from "@/services/audit.service";
import { ledgerService } from "@/services/ledger.service";
import { ledgerAccountService } from "@/services/ledger-account.service";
import { investmentCycleService } from "@/services/investment-cycle.service";
import { investmentCycleMetricsService } from "@/services/investment-cycle-metrics.service";
import { walletProjectionService } from "@/services/wallet-projection.service";
import type { SettlementBatch } from "@/domain/financial/types";
import type { InvestmentAllocationStatus } from "@/constants/investment-allocation";
import { INVESTMENT_ALLOCATION_SETTLEABLE_STATUSES } from "@/constants/investment-allocation";
import { publishPlatformEvent, PLATFORM_EVENT_TYPES } from "@/lib/platform-events/publish";
import { resolveCycleManagerUserId } from "@/lib/platform-events/resolve-recipients";

type BatchRow = {
  id: string;
  batch_reference: string;
  investment_cycle_id: string | null;
  status: string;
  total_amount: string | number;
  allocation_count: number;
  ledger_transaction_id: string | null;
  created_by: string | null;
  approved_by: string | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type AllocationRow = {
  id: string;
  investment_cycle_id: string;
  investor_id: string;
  amount: string | number;
  currency: string;
  status: InvestmentAllocationStatus;
  reference_number: string;
  settlement_transaction_id: string | null;
};

function mapBatch(row: BatchRow): SettlementBatch {
  return {
    id: row.id,
    batchReference: row.batch_reference,
    investmentCycleId: row.investment_cycle_id,
    status: row.status as SettlementBatch["status"],
    totalAmount: typeof row.total_amount === "number" ? row.total_amount : Number(row.total_amount),
    allocationCount: row.allocation_count,
    ledgerTransactionId: row.ledger_transaction_id,
    createdBy: row.created_by,
    approvedBy: row.approved_by,
    notes: row.notes,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getAllocationRow(id: string): Promise<AllocationRow> {
  const db = createAdminClient();
  const { data, error } = await db.from("investment_allocations").select("*").eq("id", id).maybeSingle();
  if (error || !data) throw new Error("Allocation not found.");
  return data as AllocationRow;
}

export const settlementService = {
  async confirmFunding(allocationId: string, actorId: string): Promise<void> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const allocation = await getAllocationRow(allocationId);
    assertAllocationTransition(allocation.status, "funding_confirmed");

    const cycle = await investmentCycleService.getById(allocation.investment_cycle_id);
    if (!cycle) throw new Error("Cycle not found.");
    assertCycleAllowsFundingConfirmation(cycle.status);

    const amount = Number(allocation.amount);
    assertPositiveAmount(amount);

    const projection = await walletProjectionService.getForInvestor(allocation.investor_id);
    if (projection.available < amount) {
      throw new Error(
        `Insufficient available balance. Required ${amount}, available ${projection.available}.`
      );
    }

    const accounts = await ledgerAccountService.ensureInvestorAccounts(allocation.investor_id);

    const { transaction } = await ledgerService.postTransaction({
      description: `Reserve allocation ${allocation.reference_number}`,
      transactionType: "allocation_reserve",
      sourceType: "investment_allocation",
      sourceId: allocationId,
      actorId,
      entries: [
        { accountId: accounts.available.id, entrySide: "debit", amount, memo: "Reserve for allocation" },
        { accountId: accounts.reserved.id, entrySide: "credit", amount, memo: "Reserved funds" },
      ],
    });

    const db = createAdminClient();
    await db
      .from("investment_allocations")
      .update({
        status: "funding_confirmed",
        funding_confirmed_at: new Date().toISOString(),
      } as never)
      .eq("id", allocationId);

    await investmentCycleMetricsService.recalculateCycleRaisedCapital(allocation.investment_cycle_id);

    await auditService.log({
      actorId,
      action: FINANCIAL_AUDIT_ACTIONS.ALLOCATION_FUNDING_CONFIRMED,
      entityType: "investment_allocation",
      entityId: allocationId,
      newValues: { status: "funding_confirmed", ledgerTransactionId: transaction.id },
    });

    publishPlatformEvent({
      eventType: PLATFORM_EVENT_TYPES.ALLOCATION_FUNDING_CONFIRMED,
      category: "financial",
      entityType: "investment_allocation",
      entityId: allocationId,
      actorId,
      payload: {
        investorId: allocation.investor_id,
        amount: Number(allocation.amount),
        referenceNumber: allocation.reference_number,
        cycleId: allocation.investment_cycle_id,
        summary: `Funding confirmed for allocation ${allocation.reference_number}`,
      },
    });
  },

  async settleAllocation(allocationId: string, actorId: string): Promise<void> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const allocation = await getAllocationRow(allocationId);
    if (!INVESTMENT_ALLOCATION_SETTLEABLE_STATUSES.includes(allocation.status)) {
      throw new Error("Allocation is not ready for settlement.");
    }

    const cycle = await investmentCycleService.getById(allocation.investment_cycle_id);
    if (!cycle) throw new Error("Cycle not found.");
    assertCycleAllowsSettlement(cycle.status);

    const amount = Number(allocation.amount);
    const investorAccounts = await ledgerAccountService.ensureInvestorAccounts(allocation.investor_id);
    const cycleAccounts = await ledgerAccountService.ensureCycleAccounts(cycle.id, cycle.name);

    const { transaction } = await ledgerService.postTransaction({
      description: `Settle allocation ${allocation.reference_number} to cycle ${cycle.name}`,
      transactionType: "allocation_settlement",
      sourceType: "investment_allocation",
      sourceId: allocationId,
      actorId,
      entries: [
        { accountId: investorAccounts.reserved.id, entrySide: "debit", amount, memo: "Release reserved" },
        { accountId: cycleAccounts.escrow.id, entrySide: "credit", amount, memo: "Cycle escrow credit" },
      ],
    });

    const db = createAdminClient();
    await db
      .from("investment_allocations")
      .update({
        status: "settled",
        settled_at: new Date().toISOString(),
        settlement_transaction_id: transaction.id,
      } as never)
      .eq("id", allocationId);

    await investmentCycleMetricsService.recalculateCycleRaisedCapital(allocation.investment_cycle_id);

    await auditService.log({
      actorId,
      action: FINANCIAL_AUDIT_ACTIONS.ALLOCATION_SETTLED,
      entityType: "investment_allocation",
      entityId: allocationId,
      newValues: { status: "settled", ledgerTransactionId: transaction.id },
    });

    publishPlatformEvent({
      eventType: PLATFORM_EVENT_TYPES.ALLOCATION_SETTLED,
      category: "financial",
      entityType: "investment_allocation",
      entityId: allocationId,
      actorId,
      payload: {
        investorId: allocation.investor_id,
        amount: Number(allocation.amount),
        referenceNumber: allocation.reference_number,
        cycleId: allocation.investment_cycle_id,
        cycleName: cycle.name,
        summary: `Allocation ${allocation.reference_number} settled to ${cycle.name}`,
      },
    });
  },

  async rejectAllocation(allocationId: string, actorId: string, reason: string): Promise<void> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const allocation = await getAllocationRow(allocationId);

    if (allocation.status === "funding_confirmed") {
      const amount = Number(allocation.amount);
      const accounts = await ledgerAccountService.ensureInvestorAccounts(allocation.investor_id);
      await ledgerService.postTransaction({
        description: `Release reserved allocation ${allocation.reference_number}: ${reason}`,
        transactionType: "allocation_release",
        sourceType: "investment_allocation",
        sourceId: allocationId,
        actorId,
        entries: [
          { accountId: accounts.reserved.id, entrySide: "debit", amount, memo: "Release reserve" },
          { accountId: accounts.available.id, entrySide: "credit", amount, memo: "Return to available" },
        ],
      });
    }

    const db = createAdminClient();
    await db
      .from("investment_allocations")
      .update({ status: "rejected" } as never)
      .eq("id", allocationId);

    await investmentCycleMetricsService.recalculateCycleRaisedCapital(allocation.investment_cycle_id);

    await auditService.log({
      actorId,
      action: FINANCIAL_AUDIT_ACTIONS.ALLOCATION_REJECTED,
      entityType: "investment_allocation",
      entityId: allocationId,
      newValues: { status: "rejected", reason },
    });

    publishPlatformEvent({
      eventType: PLATFORM_EVENT_TYPES.ALLOCATION_REJECTED,
      category: "financial",
      entityType: "investment_allocation",
      entityId: allocationId,
      actorId,
      severity: "warning",
      payload: {
        investorId: allocation.investor_id,
        amount: Number(allocation.amount),
        referenceNumber: allocation.reference_number,
        reason,
        summary: `Allocation ${allocation.reference_number} rejected`,
      },
    });
  },

  async createSettlementBatch(cycleId: string, actorId: string, notes?: string): Promise<SettlementBatch> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const cycle = await investmentCycleService.getById(cycleId);
    if (!cycle) throw new Error("Cycle not found.");
    assertCycleAllowsSettlement(cycle.status);

    const db = createAdminClient();
    const { data: allocations } = await db
      .from("investment_allocations")
      .select("id, amount")
      .eq("investment_cycle_id", cycleId)
      .eq("status", "funding_confirmed");

    const rows = (allocations ?? []) as Array<{ id: string; amount: number }>;
    if (rows.length === 0) throw new Error("No allocations ready for settlement.");

    const totalAmount = rows.reduce((s, a) => s + Number(a.amount), 0);
    const batchReference = generateLedgerReference("SET");

    const { data, error } = await db
      .from("settlement_batches")
      .insert({
        batch_reference: batchReference,
        investment_cycle_id: cycleId,
        status: "pending",
        total_amount: totalAmount,
        allocation_count: rows.length,
        created_by: actorId,
        notes: notes ?? null,
      } as never)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const batch = mapBatch(data as BatchRow);

    const poolManagerUserId = await resolveCycleManagerUserId(cycleId);

    publishPlatformEvent({
      eventType: PLATFORM_EVENT_TYPES.SETTLEMENT_BATCH_CREATED,
      category: "financial",
      entityType: "settlement_batch",
      entityId: batch.id,
      actorId,
      payload: {
        poolManagerUserId,
        cycleId,
        cycleName: cycle.name,
        batchReference: batch.batchReference,
        allocationCount: batch.allocationCount,
        totalAmount: batch.totalAmount,
        summary: `Settlement batch ${batch.batchReference} created`,
      },
    });

    return batch;
  },

  async processSettlementBatch(batchId: string, actorId: string): Promise<SettlementBatch> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const { data: batchData, error: batchError } = await db
      .from("settlement_batches")
      .select("*")
      .eq("id", batchId)
      .maybeSingle();
    if (batchError || !batchData) throw new Error("Settlement batch not found.");

    const batch = mapBatch(batchData as BatchRow);
    if (batch.status !== "pending") throw new Error("Batch is not pending.");

    await db
      .from("settlement_batches")
      .update({ status: "processing" } as never)
      .eq("id", batchId);

    const { data: allocations } = await db
      .from("investment_allocations")
      .select("id")
      .eq("investment_cycle_id", batch.investmentCycleId!)
      .eq("status", "funding_confirmed");

    for (const row of (allocations ?? []) as Array<{ id: string }>) {
      await this.settleAllocation(row.id, actorId);
    }

    const { data: updated, error } = await db
      .from("settlement_batches")
      .update({
        status: "completed",
        approved_by: actorId,
        completed_at: new Date().toISOString(),
      } as never)
      .eq("id", batchId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    await auditService.log({
      actorId,
      action: FINANCIAL_AUDIT_ACTIONS.SETTLEMENT_BATCH,
      entityType: "settlement_batch",
      entityId: batchId,
      newValues: { allocationCount: batch.allocationCount, totalAmount: batch.totalAmount },
    });

    const poolManagerUserId = batch.investmentCycleId
      ? await resolveCycleManagerUserId(batch.investmentCycleId)
      : null;

    publishPlatformEvent({
      eventType: PLATFORM_EVENT_TYPES.SETTLEMENT_BATCH_COMPLETED,
      category: "financial",
      entityType: "settlement_batch",
      entityId: batchId,
      actorId,
      payload: {
        poolManagerUserId,
        cycleId: batch.investmentCycleId,
        batchReference: batch.batchReference,
        allocationCount: batch.allocationCount,
        totalAmount: batch.totalAmount,
        summary: `Settlement batch ${batch.batchReference} completed`,
      },
    });

    return mapBatch(updated as BatchRow);
  },

  async listPendingBatches(): Promise<SettlementBatch[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data, error } = await db
      .from("settlement_batches")
      .select("*")
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return ((data ?? []) as BatchRow[]).map(mapBatch);
  },

  async listBatchHistory(limit = 30): Promise<SettlementBatch[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data, error } = await db
      .from("settlement_batches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return ((data ?? []) as BatchRow[]).map(mapBatch);
  },
};
