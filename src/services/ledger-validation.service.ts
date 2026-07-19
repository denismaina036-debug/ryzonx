import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { computeAccountBalance } from "@/lib/financial/ledger-utils";
import type { LedgerAccountType } from "@/constants/ledger";
import type { LedgerIntegrityReport, TrialBalanceRow } from "@/domain/financial/types";

type AccountRow = {
  id: string;
  code: string;
  name: string;
  account_type: LedgerAccountType;
};

type EntryAggregate = {
  account_id: string;
  entry_side: string;
  amount: number;
};

export const ledgerValidationService = {
  async buildTrialBalance(): Promise<TrialBalanceRow[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const { data: accounts, error: accountsError } = await db
      .from("ledger_accounts")
      .select("id, code, name, account_type")
      .eq("is_active", true)
      .order("code");

    if (accountsError) throw new Error(accountsError.message);

    const { data: entries, error: entriesError } = await db
      .from("ledger_entries")
      .select("account_id, entry_side, amount");

    if (entriesError) throw new Error(entriesError.message);

    const byAccount = new Map<string, { debits: number; credits: number }>();
    for (const entry of (entries ?? []) as EntryAggregate[]) {
      const current = byAccount.get(entry.account_id) ?? { debits: 0, credits: 0 };
      if (entry.entry_side === "debit") current.debits += Number(entry.amount);
      else current.credits += Number(entry.amount);
      byAccount.set(entry.account_id, current);
    }

    return ((accounts ?? []) as AccountRow[]).map((account) => {
      const totals = byAccount.get(account.id) ?? { debits: 0, credits: 0 };
      const balance = computeAccountBalance(account.account_type, totals.debits, totals.credits);
      return {
        accountCode: account.code,
        accountName: account.name,
        accountType: account.account_type,
        debitTotal: totals.debits,
        creditTotal: totals.credits,
        balance,
      };
    });
  },

  async verifyIntegrity(): Promise<LedgerIntegrityReport> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const trialBalance = await this.buildTrialBalance();

    const totalDebits = trialBalance.reduce((s, r) => s + r.debitTotal, 0);
    const totalCredits = trialBalance.reduce((s, r) => s + r.creditTotal, 0);
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.001;

    const [{ data: allEntries }, { data: allTransactions }] = await Promise.all([
      db.from("ledger_entries").select("transaction_id"),
      db.from("ledger_transactions").select("id"),
    ]);
    const validTxIds = new Set(
      ((allTransactions ?? []) as Array<{ id: string }>).map((t) => t.id)
    );
    const orphanEntries = ((allEntries ?? []) as Array<{ transaction_id: string }>).filter(
      (e) => !validTxIds.has(e.transaction_id)
    ).length;

    const { data: txRows } = await db.from("ledger_transactions").select("id, reference, status");
    const mismatchedTransactions: string[] = [];

    for (const tx of (txRows ?? []) as Array<{ id: string; reference: string; status: string }>) {
      const { data: txEntries } = await db
        .from("ledger_entries")
        .select("entry_side, amount")
        .eq("transaction_id", tx.id);

      const debits = ((txEntries ?? []) as EntryAggregate[])
        .filter((e) => e.entry_side === "debit")
        .reduce((s, e) => s + Number(e.amount), 0);
      const credits = ((txEntries ?? []) as EntryAggregate[])
        .filter((e) => e.entry_side === "credit")
        .reduce((s, e) => s + Number(e.amount), 0);

      if (Math.abs(debits - credits) > 0.001) {
        mismatchedTransactions.push(tx.reference);
      }
    }

    const [{ count: settlementPending }, { count: distributionPending }] = await Promise.all([
      db
        .from("settlement_batches")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "processing"]),
      db
        .from("distribution_records")
        .select("*", { count: "exact", head: true })
        .in("status", ["preparation", "batch", "pending", "approved"]),
    ]);

    return {
      trialBalance,
      isBalanced,
      orphanEntries,
      mismatchedTransactions,
      settlementPending: settlementPending ?? 0,
      distributionPending: distributionPending ?? 0,
    };
  },
};
