import type { LedgerAccountType, LedgerEntrySide } from "@/constants/ledger";

/** Normal balance side for account types */
export function accountNormalSide(accountType: LedgerAccountType): LedgerEntrySide {
  switch (accountType) {
    case "asset":
    case "expense":
      return "debit";
    case "liability":
    case "equity":
    case "revenue":
      return "credit";
  }
}

export function computeAccountBalance(
  accountType: LedgerAccountType,
  debits: number,
  credits: number
): number {
  const normal = accountNormalSide(accountType);
  if (normal === "debit") return debits - credits;
  return credits - debits;
}

export function assertBalancedEntries(
  entries: Array<{ entrySide: LedgerEntrySide; amount: number }>
): void {
  const debits = entries
    .filter((e) => e.entrySide === "debit")
    .reduce((s, e) => s + e.amount, 0);
  const credits = entries
    .filter((e) => e.entrySide === "credit")
    .reduce((s, e) => s + e.amount, 0);
  if (Math.abs(debits - credits) > 0.001) {
    throw new Error(`Ledger entries must balance. Debits=${debits}, Credits=${credits}`);
  }
  if (debits === 0) {
    throw new Error("Ledger transaction must have non-zero entries.");
  }
}

export function generateLedgerReference(prefix: string): string {
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  return `${prefix}-${suffix}`;
}
