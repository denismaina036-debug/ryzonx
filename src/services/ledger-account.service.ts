import { createAdminClient } from "@/lib/supabase/admin";
import type { LedgerAccountType, LedgerOwnerType } from "@/constants/ledger";
import { computeAccountBalance } from "@/lib/financial/ledger-utils";
import type { LedgerAccount } from "@/domain/financial/types";

type AccountRow = {
  id: string;
  code: string;
  name: string;
  account_type: LedgerAccountType;
  owner_type: LedgerOwnerType;
  owner_id: string | null;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function mapAccount(row: AccountRow): LedgerAccount {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    accountType: row.account_type,
    ownerType: row.owner_type,
    ownerId: row.owner_id,
    currency: row.currency,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const ledgerAccountService = {
  async getByCode(code: string): Promise<LedgerAccount | null> {
    const db = createAdminClient();
    const { data, error } = await db.from("ledger_accounts").select("*").eq("code", code).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapAccount(data as AccountRow) : null;
  },

  async getOrCreate(input: {
    code: string;
    name: string;
    accountType: LedgerAccountType;
    ownerType: LedgerOwnerType;
    ownerId?: string | null;
    currency?: string;
  }): Promise<LedgerAccount> {
    const existing = await this.getByCode(input.code);
    if (existing) return existing;

    const db = createAdminClient();
    const row = {
      code: input.code,
      name: input.name,
      account_type: input.accountType,
      owner_type: input.ownerType,
      owner_id: input.ownerId ?? null,
      currency: input.currency ?? "USD",
    };

    const { data, error } = await db
      .from("ledger_accounts")
      .upsert(row as never, { onConflict: "code" })
      .select("*")
      .single();

    if (!error && data) {
      return mapAccount(data as AccountRow);
    }

    // Fallback for concurrent inserts or upsert edge cases — always re-fetch by code.
    const retry = await this.getByCode(input.code);
    if (retry) return retry;

    throw new Error(error?.message ?? "Could not create ledger account.");
  },

  async getBalance(accountId: string): Promise<number> {
    const db = createAdminClient();
    const { data: account, error: accountError } = await db
      .from("ledger_accounts")
      .select("account_type")
      .eq("id", accountId)
      .maybeSingle();
    if (accountError || !account) return 0;

    const { data: entries, error } = await db
      .from("ledger_entries")
      .select("entry_side, amount")
      .eq("account_id", accountId);

    if (error) throw new Error(error.message);

    const debits = ((entries ?? []) as Array<{ entry_side: string; amount: number }>)
      .filter((e) => e.entry_side === "debit")
      .reduce((s, e) => s + Number(e.amount), 0);
    const credits = ((entries ?? []) as Array<{ entry_side: string; amount: number }>)
      .filter((e) => e.entry_side === "credit")
      .reduce((s, e) => s + Number(e.amount), 0);

    return computeAccountBalance(
      (account as { account_type: LedgerAccountType }).account_type,
      debits,
      credits
    );
  },

  async listByOwner(ownerType: LedgerOwnerType, ownerId: string): Promise<LedgerAccount[]> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("ledger_accounts")
      .select("*")
      .eq("owner_type", ownerType)
      .eq("owner_id", ownerId);

    if (error) throw new Error(error.message);
    return ((data ?? []) as AccountRow[]).map(mapAccount);
  },

  async ensureInvestorAccounts(investorId: string): Promise<{
    available: LedgerAccount;
    reserved: LedgerAccount;
    settled: LedgerAccount;
  }> {
    const {
      investorAvailableAccountCode,
      investorReservedAccountCode,
      investorSettledAccountCode,
    } = await import("@/constants/ledger");

    const [available, reserved, settled] = await Promise.all([
      this.getOrCreate({
        code: investorAvailableAccountCode(investorId),
        name: `Investor Available (${investorId.slice(0, 8)})`,
        accountType: "liability",
        ownerType: "investor",
        ownerId: investorId,
      }),
      this.getOrCreate({
        code: investorReservedAccountCode(investorId),
        name: `Investor Reserved (${investorId.slice(0, 8)})`,
        accountType: "liability",
        ownerType: "investor",
        ownerId: investorId,
      }),
      this.getOrCreate({
        code: investorSettledAccountCode(investorId),
        name: `Investor Settled (${investorId.slice(0, 8)})`,
        accountType: "liability",
        ownerType: "investor",
        ownerId: investorId,
      }),
    ]);

    return { available, reserved, settled };
  },

  async ensureCycleAccounts(cycleId: string, cycleName: string): Promise<{
    escrow: LedgerAccount;
    settled: LedgerAccount;
  }> {
    const { cycleEscrowAccountCode, cycleSettledAccountCode } = await import("@/constants/ledger");

    const [escrow, settled] = await Promise.all([
      this.getOrCreate({
        code: cycleEscrowAccountCode(cycleId),
        name: `Cycle Escrow — ${cycleName}`,
        accountType: "liability",
        ownerType: "investment_cycle",
        ownerId: cycleId,
      }),
      this.getOrCreate({
        code: cycleSettledAccountCode(cycleId),
        name: `Cycle Settled — ${cycleName}`,
        accountType: "liability",
        ownerType: "investment_cycle",
        ownerId: cycleId,
      }),
    ]);

    return { escrow, settled };
  },

  async ensurePoolManagerAccounts(managerId: string, displayName?: string): Promise<{
    available: LedgerAccount;
    pending: LedgerAccount;
  }> {
    const { poolManagerAvailableAccountCode, poolManagerPendingAccountCode } =
      await import("@/constants/ledger");
    const label = displayName?.trim() || managerId.slice(0, 8);

    const [available, pending] = await Promise.all([
      this.getOrCreate({
        code: poolManagerAvailableAccountCode(managerId),
        name: `PM Available — ${label}`,
        accountType: "liability",
        ownerType: "pool_manager",
        ownerId: managerId,
      }),
      this.getOrCreate({
        code: poolManagerPendingAccountCode(managerId),
        name: `PM Pending — ${label}`,
        accountType: "liability",
        ownerType: "pool_manager",
        ownerId: managerId,
      }),
    ]);

    return { available, pending };
  },

  async ensurePlatformRevenueAccount(): Promise<LedgerAccount> {
    const { PLATFORM_ACCOUNT_CODES } = await import("@/constants/ledger");
    return this.getOrCreate({
      code: PLATFORM_ACCOUNT_CODES.REVENUE,
      name: "RyvonX Platform Service Revenue",
      accountType: "revenue",
      ownerType: "platform",
    });
  },

  async ensureCycleProfitPayableAccount(cycleId: string, cycleName: string): Promise<LedgerAccount> {
    const { cycleProfitPayableAccountCode } = await import("@/constants/ledger");
    return this.getOrCreate({
      code: cycleProfitPayableAccountCode(cycleId),
      name: `Cycle Profit Payable — ${cycleName}`,
      accountType: "liability",
      ownerType: "investment_cycle",
      ownerId: cycleId,
    });
  },
};
