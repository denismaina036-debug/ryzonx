import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { FINANCIAL_AUDIT_ACTIONS } from "@/constants/ledger";
import { generateLedgerReference } from "@/lib/financial/ledger-utils";
import { assertPositiveAmount } from "@/lib/financial/allocation-rules";
import { auditService } from "@/services/audit.service";
import { ledgerService } from "@/services/ledger.service";
import type { FinancialAdjustment } from "@/domain/financial/types";
import type { FinancialAdjustmentStatus } from "@/constants/ledger";

type AdjustmentRow = {
  id: string;
  adjustment_reference: string;
  reason: string;
  amount: string | number;
  currency: string;
  debit_account_id: string;
  credit_account_id: string;
  status: FinancialAdjustmentStatus;
  ledger_transaction_id: string | null;
  created_by: string;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
};

function mapAdjustment(row: AdjustmentRow): FinancialAdjustment {
  return {
    id: row.id,
    adjustmentReference: row.adjustment_reference,
    reason: row.reason,
    amount: typeof row.amount === "number" ? row.amount : Number(row.amount),
    currency: row.currency,
    debitAccountId: row.debit_account_id,
    creditAccountId: row.credit_account_id,
    status: row.status,
    ledgerTransactionId: row.ledger_transaction_id,
    createdBy: row.created_by,
    approvedBy: row.approved_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const financialAdjustmentService = {
  async create(input: {
    reason: string;
    amount: number;
    debitAccountId: string;
    creditAccountId: string;
    actorId: string;
  }): Promise<FinancialAdjustment> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    assertPositiveAmount(input.amount);
    if (!input.reason.trim()) throw new Error("Adjustment reason is required.");

    const db = createAdminClient();
    const { data, error } = await db
      .from("financial_adjustments")
      .insert({
        adjustment_reference: generateLedgerReference("ADJ"),
        reason: input.reason.trim(),
        amount: input.amount,
        debit_account_id: input.debitAccountId,
        credit_account_id: input.creditAccountId,
        status: "pending",
        created_by: input.actorId,
      } as never)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const adjustment = mapAdjustment(data as AdjustmentRow);

    await auditService.log({
      actorId: input.actorId,
      action: FINANCIAL_AUDIT_ACTIONS.ADJUSTMENT_CREATED,
      entityType: "financial_adjustment",
      entityId: adjustment.id,
      newValues: { amount: input.amount, reason: input.reason },
    });

    return adjustment;
  },

  async approveAndPost(adjustmentId: string, actorId: string): Promise<FinancialAdjustment> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data: row, error: fetchError } = await db
      .from("financial_adjustments")
      .select("*")
      .eq("id", adjustmentId)
      .maybeSingle();
    if (fetchError || !row) throw new Error("Adjustment not found.");

    const existing = mapAdjustment(row as AdjustmentRow);
    if (existing.status !== "pending") throw new Error("Adjustment is not pending.");

    const { transaction } = await ledgerService.postTransaction({
      description: `Financial adjustment: ${existing.reason}`,
      transactionType: "adjustment",
      sourceType: "financial_adjustment",
      sourceId: adjustmentId,
      actorId,
      entries: [
        { accountId: existing.debitAccountId, entrySide: "debit", amount: existing.amount },
        { accountId: existing.creditAccountId, entrySide: "credit", amount: existing.amount },
      ],
    });

    const { data, error } = await db
      .from("financial_adjustments")
      .update({
        status: "posted",
        approved_by: actorId,
        ledger_transaction_id: transaction.id,
      } as never)
      .eq("id", adjustmentId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    await auditService.log({
      actorId,
      action: FINANCIAL_AUDIT_ACTIONS.ADJUSTMENT_POSTED,
      entityType: "financial_adjustment",
      entityId: adjustmentId,
      newValues: { ledgerTransactionId: transaction.id },
    });

    return mapAdjustment(data as AdjustmentRow);
  },

  async reject(adjustmentId: string, actorId: string): Promise<FinancialAdjustment> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data, error } = await db
      .from("financial_adjustments")
      .update({ status: "rejected", approved_by: actorId } as never)
      .eq("id", adjustmentId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return mapAdjustment(data as AdjustmentRow);
  },

  async listOutstanding(): Promise<FinancialAdjustment[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data, error } = await db
      .from("financial_adjustments")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return ((data ?? []) as AdjustmentRow[]).map(mapAdjustment);
  },
};
