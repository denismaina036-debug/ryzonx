import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import type { LedgerEntrySide, LedgerTransactionType } from "@/constants/ledger";
import { FINANCIAL_AUDIT_ACTIONS, LEDGER_ENTITY_TYPE } from "@/constants/ledger";
import { auditService } from "@/services/audit.service";
import { publishPlatformEvent, PLATFORM_EVENT_TYPES } from "@/lib/platform-events/publish";
import { assertBalancedEntries, generateLedgerReference } from "@/lib/financial/ledger-utils";
import type { LedgerEntry, LedgerTransaction } from "@/domain/financial/types";

type TransactionRow = {
  id: string;
  reference: string;
  description: string;
  transaction_type: LedgerTransactionType;
  status: string;
  source_type: string | null;
  source_id: string | null;
  actor_id: string | null;
  metadata: Record<string, unknown>;
  posted_at: string;
  reversed_at: string | null;
  reversal_transaction_id: string | null;
  created_at: string;
};

type EntryRow = {
  id: string;
  transaction_id: string;
  account_id: string;
  entry_side: LedgerEntrySide;
  amount: string | number;
  currency: string;
  memo: string | null;
  created_at: string;
};

function mapTransaction(row: TransactionRow): LedgerTransaction {
  return {
    id: row.id,
    reference: row.reference,
    description: row.description,
    transactionType: row.transaction_type,
    status: row.status as LedgerTransaction["status"],
    sourceType: row.source_type,
    sourceId: row.source_id,
    actorId: row.actor_id,
    metadata: row.metadata ?? {},
    postedAt: row.posted_at,
    reversedAt: row.reversed_at,
    reversalTransactionId: row.reversal_transaction_id,
    createdAt: row.created_at,
  };
}

function mapEntry(row: EntryRow): LedgerEntry {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    accountId: row.account_id,
    entrySide: row.entry_side,
    amount: typeof row.amount === "number" ? row.amount : Number(row.amount),
    currency: row.currency,
    memo: row.memo,
    createdAt: row.created_at,
  };
}

export interface PostLedgerTransactionInput {
  reference?: string;
  description: string;
  transactionType: LedgerTransactionType;
  sourceType?: string;
  sourceId?: string;
  actorId?: string | null;
  metadata?: Record<string, unknown>;
  entries: Array<{
    accountId: string;
    entrySide: LedgerEntrySide;
    amount: number;
    memo?: string;
  }>;
}

export const ledgerService = {
  async postTransaction(input: PostLedgerTransactionInput): Promise<{
    transaction: LedgerTransaction;
    entries: LedgerEntry[];
  }> {
    assertBalancedEntries(
      input.entries.map((e) => ({ entrySide: e.entrySide, amount: e.amount }))
    );

    const db = createAdminClient();
    const reference = input.reference ?? generateLedgerReference("LDG");

    const { data: txData, error: txError } = await db
      .from("ledger_transactions")
      .insert({
        reference,
        description: input.description,
        transaction_type: input.transactionType,
        status: "posted",
        source_type: input.sourceType ?? null,
        source_id: input.sourceId ?? null,
        actor_id: input.actorId ?? null,
        metadata: input.metadata ?? {},
      } as never)
      .select("*")
      .single();

    if (txError) throw new Error(txError.message);
    const transaction = mapTransaction(txData as TransactionRow);

    const entryRows = input.entries.map((e) => ({
      transaction_id: transaction.id,
      account_id: e.accountId,
      entry_side: e.entrySide,
      amount: e.amount,
      currency: "USD",
      memo: e.memo ?? null,
    }));

    const { data: entriesData, error: entriesError } = await db
      .from("ledger_entries")
      .insert(entryRows as never)
      .select("*");

    if (entriesError) throw new Error(entriesError.message);

    if (input.actorId) {
      await auditService.log({
        actorId: input.actorId,
        action: FINANCIAL_AUDIT_ACTIONS.LEDGER_POSTED,
        entityType: LEDGER_ENTITY_TYPE,
        entityId: transaction.id,
        newValues: { reference, transactionType: input.transactionType, amount: input.entries[0]?.amount },
      });
    }

    publishPlatformEvent({
      eventType: PLATFORM_EVENT_TYPES.LEDGER_TRANSACTION_POSTED,
      category: "financial",
      entityType: "ledger_transaction",
      entityId: transaction.id,
      actorId: input.actorId ?? null,
      payload: {
        reference,
        transactionType: input.transactionType,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        summary: `Ledger transaction posted: ${reference}`,
      },
    });

    return {
      transaction,
      entries: ((entriesData ?? []) as EntryRow[]).map(mapEntry),
    };
  },

  async getTransaction(id: string): Promise<LedgerTransaction | null> {
    const db = createAdminClient();
    const { data, error } = await db.from("ledger_transactions").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapTransaction(data as TransactionRow) : null;
  },

  async listEntriesForTransaction(transactionId: string): Promise<LedgerEntry[]> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("ledger_entries")
      .select("*")
      .eq("transaction_id", transactionId);

    if (error) throw new Error(error.message);
    return ((data ?? []) as EntryRow[]).map(mapEntry);
  },

  async listRecent(limit = 50): Promise<LedgerTransaction[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data, error } = await db
      .from("ledger_transactions")
      .select("*")
      .order("posted_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return ((data ?? []) as TransactionRow[]).map(mapTransaction);
  },

  async listBySource(sourceType: string, sourceId: string): Promise<LedgerTransaction[]> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("ledger_transactions")
      .select("*")
      .eq("source_type", sourceType)
      .eq("source_id", sourceId)
      .order("posted_at", { ascending: false });

    if (error) throw new Error(error.message);
    return ((data ?? []) as TransactionRow[]).map(mapTransaction);
  },

  async reverseTransaction(
    transactionId: string,
    actorId: string,
    reason: string
  ): Promise<LedgerTransaction> {
    await requireRole(USER_ROLES.ADMINISTRATOR);

    const original = await this.getTransaction(transactionId);
    if (!original) throw new Error("Transaction not found.");
    if (original.status === "reversed") throw new Error("Transaction already reversed.");

    const originalEntries = await this.listEntriesForTransaction(transactionId);
    const reversedEntries = originalEntries.map((e) => ({
      accountId: e.accountId,
      entrySide: e.entrySide === "debit" ? ("credit" as const) : ("debit" as const),
      amount: e.amount,
      memo: `Reversal: ${reason}`,
    }));

    const { transaction: reversalTx } = await this.postTransaction({
      reference: generateLedgerReference("REV"),
      description: `Reversal of ${original.reference}: ${reason}`,
      transactionType: "reversal",
      sourceType: original.sourceType ?? undefined,
      sourceId: original.sourceId ?? undefined,
      actorId,
      metadata: { reversedTransactionId: transactionId, reason },
      entries: reversedEntries,
    });

    const db = createAdminClient();
    await db
      .from("ledger_transactions")
      .update({
        status: "reversed",
        reversed_at: new Date().toISOString(),
        reversal_transaction_id: reversalTx.id,
      } as never)
      .eq("id", transactionId);

    await auditService.log({
      actorId,
      action: FINANCIAL_AUDIT_ACTIONS.LEDGER_REVERSED,
      entityType: LEDGER_ENTITY_TYPE,
      entityId: transactionId,
      newValues: { reversalTransactionId: reversalTx.id, reason },
    });

    publishPlatformEvent({
      eventType: PLATFORM_EVENT_TYPES.LEDGER_TRANSACTION_REVERSED,
      category: "financial",
      entityType: "ledger_transaction",
      entityId: transactionId,
      actorId,
      severity: "warning",
      payload: {
        reversalTransactionId: reversalTx.id,
        reason,
        summary: `Ledger transaction ${original.reference} reversed`,
      },
    });

    return reversalTx;
  },
};
