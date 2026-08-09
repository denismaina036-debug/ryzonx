import { DEFAULT_FUND_ID } from "@/constants/funds";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { attachTransactionReference } from "@/lib/transaction/insert";
import { roundMoney } from "@/lib/investment-engine/ownership";
import { communicationTriggers } from "@/services/communication";
import { formatMoney } from "@/services/communication/user-variables";
import { investmentCycleService } from "@/services/investment-cycle.service";
import { investmentAllocationService } from "@/services/investment-allocation.service";
import { poolCapitalService } from "./pool-capital.service";
import { investorProfitWalletService } from "./investor-profit-wallet.service";

export type CycleInvestorSettlementStatus =
  | "pending_choice"
  | "profit_transferred"
  | "profit_reinvested"
  | "capital_reinvested"
  | "capital_withdrawal_requested"
  | "capital_withdrawn"
  | "closed";

export interface CycleInvestorSettlement {
  id: string;
  investmentCycleId: string;
  fundId: string;
  investorId: string;
  principalAmount: number;
  profitAmount: number;
  status: CycleInvestorSettlementStatus;
  profitResolved: boolean;
  capitalResolved: boolean;
  capitalWithdrawalTransactionId: string | null;
  poolName: string;
  cycleName: string;
  cycleNumber: number | null;
  createdAt: string;
}

type SettlementRow = Record<string, unknown>;

function settlementsTable(db: ReturnType<typeof createAdminClient>) {
  return db.from("cycle_investor_settlements");
}

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function mapRow(
  row: SettlementRow,
  meta?: { poolName?: string; cycleName?: string; cycleNumber?: number | null }
): CycleInvestorSettlement {
  return {
    id: String(row.id),
    investmentCycleId: String(row.investment_cycle_id),
    fundId: String(row.fund_id),
    investorId: String(row.investor_id),
    principalAmount: Number(row.principal_amount ?? 0),
    profitAmount: Number(row.profit_amount ?? 0),
    status: row.status as CycleInvestorSettlementStatus,
    profitResolved: Boolean(row.profit_resolved),
    capitalResolved: Boolean(row.capital_resolved),
    capitalWithdrawalTransactionId:
      row.capital_withdrawal_transaction_id != null
        ? String(row.capital_withdrawal_transaction_id)
        : null,
    poolName: meta?.poolName ?? "",
    cycleName: meta?.cycleName ?? "",
    cycleNumber: meta?.cycleNumber ?? null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

async function resolveSettlementMeta(
  db: ReturnType<typeof createAdminClient>,
  rows: SettlementRow[]
): Promise<CycleInvestorSettlement[]> {
  if (rows.length === 0) return [];

  const cycleIds = [...new Set(rows.map((r) => String(r.investment_cycle_id)))];
  const fundIds = [...new Set(rows.map((r) => String(r.fund_id)))];

  const [{ data: cycles }, { data: funds }] = await Promise.all([
    db.from("investment_cycles").select("id, name, cycle_number").in("id", cycleIds),
    db.from("funds").select("id, name").in("id", fundIds),
  ]);

  const cycleMap = new Map(
    ((cycles ?? []) as Array<{ id: string; name: string; cycle_number: number | null }>).map(
      (c) => [c.id, c]
    )
  );
  const fundMap = new Map(
    ((funds ?? []) as Array<{ id: string; name: string }>).map((f) => [f.id, f.name])
  );

  return rows.map((row) => {
    const cycleId = String(row.investment_cycle_id);
    const fundId = String(row.fund_id);
    const cycle = cycleMap.get(cycleId);
    return mapRow(row, {
      poolName: fundMap.get(fundId) ?? "Pool",
      cycleName: cycle?.name ?? "Cycle",
      cycleNumber: cycle?.cycle_number ?? null,
    });
  });
}

async function getSettlementForInvestor(
  settlementId: string,
  investorId: string
): Promise<CycleInvestorSettlement> {
  const db = createAdminClient();
  const { data, error } = await settlementsTable(db)
    .select("*")
    .eq("id", settlementId)
    .eq("investor_id", investorId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Settlement not found.");

  const [mapped] = await resolveSettlementMeta(db, [data as SettlementRow]);
  return mapped!;
}

async function ensureWalletPortfolio(
  db: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<{ available_balance: number }> {
  const { data: existing } = await db
    .from("investor_portfolios")
    .select("available_balance")
    .eq("user_id", userId)
    .eq("fund_id", DEFAULT_FUND_ID)
    .maybeSingle();

  if (existing) {
    return existing as { available_balance: number };
  }

  const { data: created, error } = await db
    .from("investor_portfolios")
    .insert({
      user_id: userId,
      fund_id: DEFAULT_FUND_ID,
      available_balance: 0,
      total_invested: 0,
      current_value: 0,
      total_deposits: 0,
    } as never)
    .select("available_balance")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Could not initialize wallet.");
  }

  return created as { available_balance: number };
}

function resolveClosedStatus(
  settlement: Pick<CycleInvestorSettlement, "profitAmount" | "principalAmount" | "profitResolved" | "capitalResolved">
): CycleInvestorSettlementStatus {
  const profitDone = settlement.profitAmount <= 0 || settlement.profitResolved;
  const capitalDone = settlement.principalAmount <= 0 || settlement.capitalResolved;
  if (profitDone && capitalDone) return "closed";
  return "pending_choice";
}

async function updateSettlement(
  id: string,
  patch: Record<string, unknown>
): Promise<void> {
  const db = createAdminClient();
  const { error } = await settlementsTable(db)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export const cycleInvestorSettlementService = {
  async createPendingChoicesForCycle(cycleId: string, fundId: string): Promise<void> {
    const db = createAdminClient();

    const { data: allocations } = await db
      .from("investment_allocations")
      .select("investor_id, amount, status")
      .eq("investment_cycle_id", cycleId)
      .in("status", ["confirmed", "locked", "settled"]);

    const { data: settlement } = await db
      .from("profit_settlements")
      .select("id")
      .eq("investment_cycle_id", cycleId)
      .eq("status", "completed")
      .maybeSingle();

    const profitByInvestor = new Map<string, number>();
    if (settlement) {
      const settlementId = (settlement as { id: string }).id;
      const { data: profitRows } = await db
        .from("profit_settlement_allocations")
        .select("investor_id, profit_share")
        .eq("profit_settlement_id", settlementId)
        .eq("status", "transferred");
      for (const row of (profitRows ?? []) as Array<{
        investor_id: string;
        profit_share: number | string;
      }>) {
        profitByInvestor.set(row.investor_id, Number(row.profit_share ?? 0));
      }
    }

    const principalByInvestor = new Map<string, number>();
    for (const row of (allocations ?? []) as Array<{
      investor_id: string;
      amount: number | string;
    }>) {
      const current = principalByInvestor.get(row.investor_id) ?? 0;
      principalByInvestor.set(row.investor_id, current + Number(row.amount ?? 0));
    }

    for (const [investorId, principalAmount] of principalByInvestor) {
      if (principalAmount <= 0) continue;
      await settlementsTable(db).upsert(
        {
          investment_cycle_id: cycleId,
          fund_id: fundId,
          investor_id: investorId,
          principal_amount: principalAmount,
          profit_amount: profitByInvestor.get(investorId) ?? 0,
          status: "pending_choice",
          profit_resolved: (profitByInvestor.get(investorId) ?? 0) <= 0,
          capital_resolved: false,
        },
        { onConflict: "investment_cycle_id,investor_id" }
      );
    }

    for (const investorId of principalByInvestor.keys()) {
      await poolCapitalService.applyWithdrawal(
        fundId,
        investorId,
        principalByInvestor.get(investorId)!
      );
    }
  },

  async listForInvestor(investorId: string): Promise<CycleInvestorSettlement[]> {
    const db = createAdminClient();
    const { data, error } = await settlementsTable(db)
      .select("*")
      .eq("investor_id", investorId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return resolveSettlementMeta(db, (data ?? []) as SettlementRow[]);
  },

  async listPendingForInvestor(investorId: string): Promise<CycleInvestorSettlement[]> {
    const all = await this.listForInvestor(investorId);
    return all.filter(
      (s) =>
        s.status !== "closed" &&
        ((!s.profitResolved && s.profitAmount > 0) ||
          (!s.capitalResolved && s.principalAmount > 0))
    );
  },

  async listPendingCapitalReturns(): Promise<
    Array<
      CycleInvestorSettlement & {
        investorName: string;
        investorEmail: string;
      }
    >
  > {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data, error } = await settlementsTable(db)
      .select("*")
      .eq("status", "capital_withdrawal_requested")
      .eq("capital_resolved", false)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const settlements = await resolveSettlementMeta(db, (data ?? []) as SettlementRow[]);
    const investorIds = [...new Set(settlements.map((s) => s.investorId))];
    const { data: profiles } = await db
      .from("profiles")
      .select("id, full_name, email")
      .in("id", investorIds);

    const profileMap = new Map(
      ((profiles ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>).map(
        (p) => [p.id, p]
      )
    );

    return settlements.map((s) => {
      const profile = profileMap.get(s.investorId);
      return {
        ...s,
        investorName: profile?.full_name?.trim() || profile?.email || "Investor",
        investorEmail: profile?.email ?? "",
      };
    });
  },

  async getForInvestorCycle(
    investorId: string,
    cycleId: string
  ): Promise<CycleInvestorSettlement | null> {
    const db = createAdminClient();
    const { data } = await settlementsTable(db)
      .select("*")
      .eq("investor_id", investorId)
      .eq("investment_cycle_id", cycleId)
      .maybeSingle();
    if (!data) return null;
    const [mapped] = await resolveSettlementMeta(db, [data as SettlementRow]);
    return mapped ?? null;
  },

  async transferProfit(settlementId: string): Promise<{ transferred: number }> {
    const user = await requireAuth();
    const settlement = await getSettlementForInvestor(settlementId, user.id);

    if (settlement.profitResolved || settlement.profitAmount <= 0) {
      throw new Error("No cycle profit available to transfer.");
    }

    const db = createAdminClient();
    const profitWallet = await investorProfitWalletService.getOrCreate(
      user.id,
      settlement.fundId,
      settlement.investmentCycleId
    );

    const transferAmount = roundMoney(
      Math.min(profitWallet.balance, settlement.profitAmount)
    );
    if (transferAmount <= 0) {
      throw new Error("No cycle profit available to transfer.");
    }

    await investorProfitWalletService.debit(
      user.id,
      settlement.fundId,
      transferAmount,
      settlement.investmentCycleId
    );

    const { ledgerAccountService } = await import("@/services/ledger-account.service");
    const { ledgerService } = await import("@/services/ledger.service");
    const poolProfitAccount = await ledgerAccountService.ensureInvestorPoolProfitAccount(
      user.id,
      settlement.fundId,
      settlement.poolName
    );
    const investorAccounts = await ledgerAccountService.ensureInvestorAccounts(user.id);
    await ledgerService.postTransaction({
      description: `Cycle profit transferred to Funding Wallet — ${settlement.cycleName}`,
      transactionType: "transfer",
      sourceType: "cycle_investor_settlement",
      sourceId: settlement.id,
      actorId: user.id,
      entries: [
        {
          accountId: poolProfitAccount.id,
          entrySide: "debit",
          amount: transferAmount,
          memo: "Cycle profit released to Funding Wallet",
        },
        {
          accountId: investorAccounts.available.id,
          entrySide: "credit",
          amount: transferAmount,
          memo: "Cycle profit transferred to Funding Wallet",
        },
      ],
    });

    const wallet = await ensureWalletPortfolio(db, user.id);
    await db
      .from("investor_portfolios")
      .update({
        available_balance: toNumber(wallet.available_balance) + transferAmount,
      } as never)
      .eq("user_id", user.id)
      .eq("fund_id", DEFAULT_FUND_ID);

    const profitNotes = `Cycle profit transferred to Funding Wallet — ${settlement.cycleName}`;
    const { data: profitTx, error: profitTxError } = await db
      .from("transactions")
      .insert({
        user_id: user.id,
        fund_id: settlement.fundId,
        type: "adjustment",
        amount: transferAmount,
        status: "completed",
        payment_method: "profit_transfer",
        notes: profitNotes,
      } as never)
      .select("id")
      .single();

    if (profitTxError || !profitTx) {
      throw new Error(profitTxError?.message ?? "Failed to record profit transfer.");
    }

    await attachTransactionReference(db, (profitTx as { id: string }).id, {
      type: "adjustment",
      payment_method: "profit_transfer",
      notes: profitNotes,
    });

    const nextStatus = resolveClosedStatus({
      ...settlement,
      profitResolved: true,
    });

    await updateSettlement(settlement.id, {
      profit_resolved: true,
      status: nextStatus === "closed" ? "closed" : "profit_transferred",
    });

    await communicationTriggers.investmentUpdated({
      userId: user.id,
      poolName: settlement.poolName,
      message: `$${transferAmount.toLocaleString()} from ${settlement.cycleName} is now in your Funding Wallet.`,
      poolId: settlement.fundId,
    });

    return { transferred: transferAmount };
  },

  async reinvestCapital(settlementId: string): Promise<{ reinvested: number }> {
    const user = await requireAuth();
    const settlement = await getSettlementForInvestor(settlementId, user.id);

    if (settlement.capitalResolved || settlement.principalAmount <= 0) {
      throw new Error("No capital available to reinvest.");
    }

    const activeCycle = await investmentCycleService.getActiveForFund(settlement.fundId);
    if (!activeCycle || !["funding", "approved"].includes(activeCycle.status)) {
      throw new Error(
        "This pool has no open funding cycle. Wait for the pool manager to open the next cycle."
      );
    }

    const amount = roundMoney(settlement.principalAmount);
    const db = createAdminClient();

    await poolCapitalService.applyInvestment(settlement.fundId, user.id, amount);
    const poolCapitalTotal = await poolCapitalService.getPoolCapitalTotal(settlement.fundId);

    const { data: poolPortfolio } = await db
      .from("investor_portfolios")
      .select("total_invested, current_value, total_deposits")
      .eq("user_id", user.id)
      .eq("fund_id", settlement.fundId)
      .maybeSingle();

    const poolRow = poolPortfolio as {
      total_invested?: number;
      current_value?: number;
      total_deposits?: number;
    } | null;

    const nextInvested = toNumber(poolRow?.total_invested) + amount;
    const nextValue = toNumber(poolRow?.current_value) + amount;

    if (poolRow) {
      await db
        .from("investor_portfolios")
        .update({
          total_invested: nextInvested,
          current_value: nextValue,
          total_deposits: toNumber(poolRow.total_deposits) + amount,
        } as never)
        .eq("user_id", user.id)
        .eq("fund_id", settlement.fundId);
    } else {
      await db.from("investor_portfolios").insert({
        user_id: user.id,
        fund_id: settlement.fundId,
        total_invested: amount,
        current_value: amount,
        total_deposits: amount,
      } as never);
    }

    const { data: fundRow } = await db
      .from("funds")
      .select("current_capital, active_investors, name")
      .eq("id", settlement.fundId)
      .maybeSingle();

    const fund = fundRow as {
      current_capital?: number;
      active_investors?: number;
      name?: string;
    } | null;

    await db
      .from("funds")
      .update({
        current_capital: toNumber(fund?.current_capital) + amount,
        investor_capital: poolCapitalTotal,
      } as never)
      .eq("id", settlement.fundId);

    await investmentAllocationService.recordMarketplaceJoin({
      cycleId: activeCycle.id,
      investorId: user.id,
      amount,
    });

    const poolName = fund?.name ?? settlement.poolName;
    const notes = `Cycle capital reinvested in ${poolName} — ${activeCycle.name}`;
    const { data: tx, error: txError } = await db
      .from("transactions")
      .insert({
        user_id: user.id,
        fund_id: settlement.fundId,
        type: "adjustment",
        amount,
        status: "completed",
        payment_method: "pool_allocation",
        notes,
      } as never)
      .select("id")
      .single();

    if (txError || !tx) {
      throw new Error(txError?.message ?? "Failed to record reinvestment.");
    }

    await attachTransactionReference(db, (tx as { id: string }).id, {
      type: "adjustment",
      payment_method: "pool_allocation",
      notes,
    });

    const nextStatus = resolveClosedStatus({
      ...settlement,
      capitalResolved: true,
    });

    await updateSettlement(settlement.id, {
      capital_resolved: true,
      status: nextStatus === "closed" ? "closed" : "capital_reinvested",
    });

    await communicationTriggers.poolInvestmentConfirmed({
      userId: user.id,
      amount: formatMoney(amount),
      poolName,
      poolId: settlement.fundId,
    });

    return { reinvested: amount };
  },

  async requestCapitalReturn(settlementId: string): Promise<{ requestId: string }> {
    const user = await requireAuth();
    const settlement = await getSettlementForInvestor(settlementId, user.id);

    if (settlement.capitalResolved || settlement.principalAmount <= 0) {
      throw new Error("No capital available to return.");
    }

    if (settlement.status === "capital_withdrawal_requested") {
      throw new Error("Capital return is already pending admin approval.");
    }

    const amount = roundMoney(settlement.principalAmount);
    const db = createAdminClient();
    const notes = `Cycle capital return to Funding Wallet — ${settlement.cycleName} (${settlement.poolName})`;

    const { data: tx, error: txError } = await db
      .from("transactions")
      .insert({
        user_id: user.id,
        fund_id: settlement.fundId,
        type: "adjustment",
        amount,
        status: "pending",
        payment_method: "cycle_capital_return",
        notes,
        metadata: { settlement_id: settlement.id, cycle_id: settlement.investmentCycleId },
      } as never)
      .select("id")
      .single();

    if (txError || !tx) {
      throw new Error(txError?.message ?? "Failed to submit capital return request.");
    }

    await attachTransactionReference(db, (tx as { id: string }).id, {
      type: "adjustment",
      payment_method: "cycle_capital_return",
      notes,
    });

    await updateSettlement(settlement.id, {
      status: "capital_withdrawal_requested",
      capital_withdrawal_transaction_id: (tx as { id: string }).id,
    });

    const { adminNotifyService } = await import("@/services/communication/admin-notify.service");
    await adminNotifyService.newWithdrawal({
      amount: formatMoney(amount),
      userName: user.email ?? user.id,
      transactionId: (tx as { id: string }).id,
      triggeredBy: user.id,
    });

    return { requestId: (tx as { id: string }).id };
  },

  async approveCapitalReturn(settlementId: string): Promise<void> {
    const admin = await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const { data: row, error } = await settlementsTable(db)
      .select("*")
      .eq("id", settlementId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!row) throw new Error("Settlement not found.");

    const settlement = (await resolveSettlementMeta(db, [row as SettlementRow]))[0]!;
    if (settlement.status !== "capital_withdrawal_requested" || settlement.capitalResolved) {
      throw new Error("This capital return is not pending approval.");
    }

    const txId = settlement.capitalWithdrawalTransactionId;
    if (!txId) throw new Error("Missing capital return transaction.");

    const { data: tx } = await db
      .from("transactions")
      .select("id, status, user_id, amount")
      .eq("id", txId)
      .maybeSingle();

    const txRow = tx as {
      id: string;
      status: string;
      user_id: string;
      amount: number | string;
    } | null;

    if (!txRow || txRow.status !== "pending") {
      throw new Error("Capital return transaction is not pending.");
    }

    const amount = toNumber(txRow.amount);
    const wallet = await ensureWalletPortfolio(db, txRow.user_id);
    await db
      .from("investor_portfolios")
      .update({
        available_balance: toNumber(wallet.available_balance) + amount,
      } as never)
      .eq("user_id", txRow.user_id)
      .eq("fund_id", DEFAULT_FUND_ID);

    const now = new Date().toISOString();
    await db
      .from("transactions")
      .update({
        status: "completed",
        processed_at: now,
        processed_by: admin.id,
        approved_by: admin.id,
      } as never)
      .eq("id", txId);

    const nextStatus = resolveClosedStatus({
      ...settlement,
      capitalResolved: true,
    });

    await updateSettlement(settlement.id, {
      capital_resolved: true,
      status: nextStatus === "closed" ? "closed" : "capital_withdrawn",
    });

    await communicationTriggers.investmentUpdated({
      userId: txRow.user_id,
      poolName: settlement.poolName,
      message: `$${amount.toLocaleString()} from ${settlement.cycleName} has been returned to your Funding Wallet.`,
      poolId: settlement.fundId,
    });
  },

  async rejectCapitalReturn(settlementId: string, adminNotes?: string): Promise<void> {
    const admin = await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const { data: row } = await settlementsTable(db)
      .select("*")
      .eq("id", settlementId)
      .maybeSingle();

    if (!row) throw new Error("Settlement not found.");
    const settlement = (await resolveSettlementMeta(db, [row as SettlementRow]))[0]!;

    const txId = settlement.capitalWithdrawalTransactionId;
    if (!txId) throw new Error("Missing capital return transaction.");

    const now = new Date().toISOString();
    await db
      .from("transactions")
      .update({
        status: "rejected",
        processed_at: now,
        processed_by: admin.id,
        admin_notes: adminNotes?.trim() || null,
      } as never)
      .eq("id", txId);

    await updateSettlement(settlement.id, {
      status: "pending_choice",
      capital_withdrawal_transaction_id: null,
    });
  },
};
