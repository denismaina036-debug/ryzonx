import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_FUND_ID } from "@/constants/funds";
import { ledgerAccountService } from "@/services/ledger-account.service";
import type { WalletProjection } from "@/domain/financial/types";

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

async function getRemainingDeployableFromDeposits(investorId: string): Promise<number> {
  const db = createAdminClient();
  const { data: walletPortfolio } = await db
    .from("investor_portfolios")
    .select("total_deposits")
    .eq("user_id", investorId)
    .eq("fund_id", DEFAULT_FUND_ID)
    .maybeSingle();

  const totalDeposits = toNumber(
    (walletPortfolio as { total_deposits?: number | string } | null)?.total_deposits
  );

  const { data: deployedRows } = await db
    .from("investor_portfolios")
    .select("total_invested")
    .eq("user_id", investorId)
    .neq("fund_id", DEFAULT_FUND_ID)
    .gt("total_invested", 0);

  const deployedToPools = ((deployedRows ?? []) as Array<{ total_invested: number | string }>).reduce(
    (sum, row) => sum + toNumber(row.total_invested),
    0
  );

  return Math.max(0, roundMoney(totalDeposits - deployedToPools));
}

async function getLegacyAvailableBalance(investorId: string): Promise<number> {
  const db = createAdminClient();
  const { data: walletPortfolio } = await db
    .from("investor_portfolios")
    .select("available_balance")
    .eq("user_id", investorId)
    .eq("fund_id", DEFAULT_FUND_ID)
    .maybeSingle();

  return toNumber(
    (walletPortfolio as { available_balance?: number | string } | null)?.available_balance
  );
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
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

async function getLegacyFundedWithdrawalTotal(investorId: string): Promise<number> {
  const db = createAdminClient();
  const { data: withdrawals } = await db
    .from("transactions")
    .select("id, amount")
    .eq("user_id", investorId)
    .eq("type", "withdrawal")
    .in("status", ["pending", "approved"]);

  const rows = (withdrawals ?? []) as Array<{ id: string; amount: number | string }>;
  if (rows.length === 0) return 0;

  const { data: ledgerRows } = await db
    .from("ledger_transactions")
    .select("source_id")
    .eq("source_type", "withdrawal")
    .in(
      "source_id",
      rows.map((row) => row.id)
    );

  const ledgerBacked = new Set(
    ((ledgerRows ?? []) as Array<{ source_id: string | null }>)
      .map((row) => row.source_id)
      .filter(Boolean)
  );

  return Math.round(
    rows
      .filter((row) => !ledgerBacked.has(row.id))
      .reduce((sum, row) => sum + toNumber(row.amount), 0) * 100
  ) / 100;
}

export const walletProjectionService = {
  async getForInvestor(investorId: string): Promise<WalletProjection> {
    const [legacyAvailable, legacyWithdrawals, pending] = await Promise.all([
      getLegacyAvailableBalance(investorId),
      getLegacyFundedWithdrawalTotal(investorId),
      getPendingAllocationTotal(investorId),
    ]);

    try {
      const accounts = await ledgerAccountService.ensureInvestorAccounts(investorId);
      const [availableLedger, reserved, settled] = await Promise.all([
        ledgerAccountService.getBalance(accounts.available.id),
        ledgerAccountService.getBalance(accounts.reserved.id),
        ledgerAccountService.getBalance(accounts.settled.id),
      ]);

      const hasLedgerActivity = availableLedger !== 0 || reserved !== 0 || settled !== 0;
      const available = hasLedgerActivity
        ? Math.max(0, Math.round((availableLedger - legacyWithdrawals) * 100) / 100)
        : legacyAvailable;
      const source: WalletProjection["source"] = hasLedgerActivity ? "ledger" : "legacy";

      return {
        available,
        reserved,
        pending,
        settled,
        currency: "USD",
        source,
      };
    } catch {
      return {
        available: legacyAvailable,
        reserved: 0,
        pending,
        settled: 0,
        currency: "USD",
        source: "legacy",
      };
    }
  },

  /** Deposit headroom for new pool investments — not applied to funding wallet display. */
  async getSpendableForPoolInvestment(investorId: string): Promise<number> {
    const [projection, depositCap] = await Promise.all([
      this.getForInvestor(investorId),
      getRemainingDeployableFromDeposits(investorId),
    ]);
    return Math.min(projection.available, depositCap);
  },
};
