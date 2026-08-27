import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_FUND_ID } from "@/constants/funds";
import { roundMoney } from "@/lib/investment-engine/ownership";
import { walletProjectionService } from "@/services/wallet-projection.service";
import type { WalletProjection } from "@/domain/financial/types";

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

export const fundingWalletService = {
  async getProjection(investorId: string): Promise<WalletProjection> {
    return walletProjectionService.getForInvestor(investorId);
  },

  usesLedger(projection: WalletProjection): boolean {
    return projection.source === "ledger";
  },

  async setLegacyAvailableBalance(
    investorId: string,
    balance: number,
    fundId: string = DEFAULT_FUND_ID
  ): Promise<void> {
    const db = createAdminClient();
    const nextBalance = roundMoney(Math.max(0, balance));

    const { error } = await db
      .from("investor_portfolios")
      .update({ available_balance: nextBalance } as never)
      .eq("user_id", investorId)
      .eq("fund_id", fundId);

    if (error) throw new Error(error.message);
  },

  /** Align legacy funding wallet with ledger-backed available balance when they diverge. */
  async reconcileLegacyAvailable(investorId: string): Promise<void> {
    const projection = await walletProjectionService.getForInvestor(investorId);
    if (projection.source !== "ledger") return;

    const db = createAdminClient();
    const { data: portfolio } = await db
      .from("investor_portfolios")
      .select("available_balance")
      .eq("user_id", investorId)
      .eq("fund_id", DEFAULT_FUND_ID)
      .maybeSingle();

    const legacy = toNumber(
      (portfolio as { available_balance?: number | string } | null)?.available_balance
    );

    if (Math.abs(legacy - projection.available) <= 0.004) return;
    await this.setLegacyAvailableBalance(investorId, projection.available);
  },

  async adjustLegacyAvailableBalance(
    investorId: string,
    delta: number,
    fundId: string = DEFAULT_FUND_ID
  ): Promise<void> {
    const db = createAdminClient();
    const { data: portfolio } = await db
      .from("investor_portfolios")
      .select("available_balance")
      .eq("user_id", investorId)
      .eq("fund_id", fundId)
      .maybeSingle();

    const available = toNumber(
      (portfolio as { available_balance?: number } | null)?.available_balance
    );
    const nextBalance = roundMoney(Math.max(0, available + delta));

    const { error } = await db
      .from("investor_portfolios")
      .update({ available_balance: nextBalance } as never)
      .eq("user_id", investorId)
      .eq("fund_id", fundId);

    if (error) throw new Error(error.message);
  },

  /** Credit the investor funding wallet (ledger + optional legacy sync). */
  async creditAvailable(input: {
    investorId: string;
    amount: number;
    description: string;
    transactionType?: "deposit_credit" | "transfer";
    sourceType: string;
    sourceId: string;
    actorId?: string | null;
    syncLegacy?: boolean;
    idempotencyKey?: string;
  }): Promise<void> {
    const amount = roundMoney(input.amount);
    if (amount <= 0) return;

    const { ledgerAccountService } = await import("@/services/ledger-account.service");
    const { ledgerService } = await import("@/services/ledger.service");
    const accounts = await ledgerAccountService.ensureInvestorAccounts(input.investorId);
    const platformSuspense = await ledgerAccountService.ensurePlatformSuspenseAccount();

    const posting = await ledgerService.postTransaction({
      description: input.description,
      transactionType: input.transactionType ?? "transfer",
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      idempotencyKey:
        input.idempotencyKey ??
        `${input.sourceType}:${input.investorId}:${input.sourceId}:funding-credit`,
      actorId: input.actorId ?? input.investorId,
      entries: [
        {
          accountId: platformSuspense.id,
          entrySide: "debit",
          amount,
          memo: input.description,
        },
        {
          accountId: accounts.available.id,
          entrySide: "credit",
          amount,
          memo: "Funding wallet credit",
        },
      ],
    });

    if (posting.created && input.syncLegacy !== false) {
      await this.adjustLegacyAvailableBalance(input.investorId, amount);
    }
  },

  /** Debit funding wallet for a pool investment (ledger reserve + optional cycle settlement). */
  async debitForPoolInvestment(input: {
    investorId: string;
    amount: number;
    sourceType: string;
    sourceId: string;
    actorId: string;
    cycleId?: string | null;
    cycleName?: string | null;
  }): Promise<void> {
    const amount = roundMoney(input.amount);
    if (amount <= 0) {
      throw new Error("Amount must be greater than zero.");
    }

    const projection = await this.getProjection(input.investorId);
    const spendable = await walletProjectionService.getSpendableForPoolInvestment(
      input.investorId
    );
    if (amount > spendable + 0.004) {
      throw new Error(
        "Insufficient available balance. Add funds to your Funding Wallet or reduce the investment amount."
      );
    }

    if (this.usesLedger(projection)) {
      const { ledgerAccountService } = await import("@/services/ledger-account.service");
      const { ledgerService } = await import("@/services/ledger.service");
      const accounts = await ledgerAccountService.ensureInvestorAccounts(input.investorId);

      const reservePosting = await ledgerService.postTransaction({
        description: `Pool investment reserved — ${input.sourceId}`,
        transactionType: "allocation_reserve",
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        idempotencyKey: `${input.sourceType}:${input.investorId}:${input.sourceId}:allocation-reserve`,
        actorId: input.actorId,
        entries: [
          {
            accountId: accounts.available.id,
            entrySide: "debit",
            amount,
            memo: "Pool investment",
          },
          {
            accountId: accounts.reserved.id,
            entrySide: "credit",
            amount,
            memo: "Reserved for pool investment",
          },
        ],
      });

      if (input.cycleId && input.cycleName) {
        const cycleAccounts = await ledgerAccountService.ensureCycleAccounts(
          input.cycleId,
          input.cycleName
        );
        await ledgerService.postTransaction({
          description: `Pool investment settled — ${input.cycleName}`,
          transactionType: "allocation_settlement",
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          idempotencyKey: `${input.sourceType}:${input.investorId}:${input.sourceId}:allocation-settlement`,
          actorId: input.actorId,
          entries: [
            {
              accountId: accounts.reserved.id,
              entrySide: "debit",
              amount,
              memo: "Release reserved funds",
            },
            {
              accountId: cycleAccounts.escrow.id,
              entrySide: "credit",
              amount,
              memo: "Cycle escrow credit",
            },
          ],
        });
      }

      if (reservePosting.created) {
        await this.adjustLegacyAvailableBalance(input.investorId, -amount);
      }
      return;
    }

    await this.adjustLegacyAvailableBalance(input.investorId, -amount);
  },

  /** Debit funding wallet for fees or other non-pool outflows. */
  async debitAvailable(input: {
    investorId: string;
    amount: number;
    description: string;
    sourceType: string;
    sourceId: string;
    actorId: string;
  }): Promise<void> {
    const amount = roundMoney(input.amount);
    if (amount <= 0) {
      throw new Error("Amount must be greater than zero.");
    }

    const projection = await this.getProjection(input.investorId);
    if (amount > projection.available + 0.004) {
      throw new Error("Insufficient available balance.");
    }

    if (this.usesLedger(projection)) {
      const { ledgerAccountService } = await import("@/services/ledger-account.service");
      const { ledgerService } = await import("@/services/ledger.service");
      const accounts = await ledgerAccountService.ensureInvestorAccounts(input.investorId);
      const platformSuspense = await ledgerAccountService.ensurePlatformSuspenseAccount();

      const posting = await ledgerService.postTransaction({
        description: input.description,
        transactionType: "transfer",
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        idempotencyKey: `${input.sourceType}:${input.investorId}:${input.sourceId}:funding-debit`,
        actorId: input.actorId,
        entries: [
          {
            accountId: accounts.available.id,
            entrySide: "debit",
            amount,
            memo: input.description,
          },
          {
            accountId: platformSuspense.id,
            entrySide: "credit",
            amount,
            memo: input.description,
          },
        ],
      });
      if (posting.created) {
        await this.adjustLegacyAvailableBalance(input.investorId, -amount);
      }
      return;
    }

    await this.adjustLegacyAvailableBalance(input.investorId, -amount);
  },
};
