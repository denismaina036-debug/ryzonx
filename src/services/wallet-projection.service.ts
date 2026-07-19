import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_FUND_ID } from "@/constants/funds";
import { ledgerAccountService } from "@/services/ledger-account.service";
import type { WalletProjection } from "@/domain/financial/types";

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

async function getLegacyAvailableBalance(investorId: string): Promise<number> {
  const db = createAdminClient();
  const { data } = await db
    .from("investor_portfolios")
    .select("available_balance")
    .eq("user_id", investorId)
    .eq("fund_id", DEFAULT_FUND_ID)
    .maybeSingle();

  return toNumber((data as { available_balance?: number } | null)?.available_balance);
}

async function getPendingAllocationTotal(investorId: string): Promise<number> {
  const db = createAdminClient();
  const { data } = await db
    .from("investment_allocations")
    .select("amount")
    .eq("investor_id", investorId)
    .eq("status", "pending");

  return ((data ?? []) as Array<{ amount: number }>).reduce((s, r) => s + toNumber(r.amount), 0);
}

export const walletProjectionService = {
  async getForInvestor(investorId: string): Promise<WalletProjection> {
    const accounts = await ledgerAccountService.ensureInvestorAccounts(investorId);
    const [availableLedger, reserved, settled, pending, legacyAvailable] = await Promise.all([
      ledgerAccountService.getBalance(accounts.available.id),
      ledgerAccountService.getBalance(accounts.reserved.id),
      ledgerAccountService.getBalance(accounts.settled.id),
      getPendingAllocationTotal(investorId),
      getLegacyAvailableBalance(investorId),
    ]);

    const hasLedgerActivity = availableLedger !== 0 || reserved !== 0 || settled !== 0;
    const available = hasLedgerActivity ? availableLedger : legacyAvailable;
    const source: WalletProjection["source"] = hasLedgerActivity ? "ledger" : "legacy";

    return {
      available,
      reserved,
      pending,
      settled,
      currency: "USD",
      source,
    };
  },
};
