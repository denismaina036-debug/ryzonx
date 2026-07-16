import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_FUND_ID } from "@/constants/funds";
import { requireAuth, requireRole } from "@/lib/auth/session";
import type { AdminDepositRequest, AdminTransaction, AdminWithdrawalRequest } from "@/features/admin/types";
import type { InvestorTransaction } from "@/features/investor/types/wallet";
import type { TransactionStatus } from "@/types";
import { communicationTriggers } from "@/services/communication/communication-triggers.service";
import { adminNotifyService } from "@/services/communication/admin-notify.service";
import { formatMoney } from "@/services/communication/user-variables";

export type { InvestorTransaction };

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

type TransactionRow = {
  id: string;
  user_id: string;
  fund_id: string;
  type: string;
  amount: number | string;
  status: string;
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  admin_notes: string | null;
  destination: string | null;
  crypto_symbol: string | null;
  crypto_network: string | null;
  crypto_amount: number | string | null;
  processed_at: string | null;
  approved_by: string | null;
  created_at: string;
};

type ProfileRow = { id: string; full_name: string; email: string };
type PoolStatsRow = { fund_id: string; win_rate: number };

type FundRow = { id: string; name: string };

async function enrichTransactions<T extends TransactionRow>(
  rows: T[]
): Promise<
  Array<
    T & {
      profile: ProfileRow | null;
      fund: FundRow | null;
      available_balance: number | null;
    }
  >
> {
  if (rows.length === 0) return [];

  const db = createAdminClient();
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const fundIds = [...new Set(rows.map((r) => r.fund_id))];

  const [profilesResult, fundsResult, portfoliosResult] = await Promise.all([
    db.from("profiles").select("id, full_name, email").in("id", userIds),
    db.from("funds").select("id, name").in("id", fundIds),
    db
      .from("investor_portfolios")
      .select("user_id, fund_id, available_balance, current_value")
      .in("user_id", userIds),
  ]);

  const profileMap = new Map(
    ((profilesResult.data ?? []) as ProfileRow[]).map((p) => [p.id, p])
  );
  const fundMap = new Map(
    ((fundsResult.data ?? []) as FundRow[]).map((f) => [f.id, f])
  );
  const portfolioMap = new Map(
    (
      (portfoliosResult.data ?? []) as Array<{
        user_id: string;
        fund_id: string;
        available_balance: number;
        current_value: number;
      }>
    ).map((p) => [`${p.user_id}:${p.fund_id}`, p])
  );

  return rows.map((row) => {
    const portfolio = portfolioMap.get(`${row.user_id}:${row.fund_id}`);
    return {
      ...row,
      profile: profileMap.get(row.user_id) ?? null,
      fund: fundMap.get(row.fund_id) ?? null,
      available_balance:
        portfolio != null ? toNumber(portfolio.available_balance) : null,
    };
  });
}

async function fetchAdminTransactionsByType(
  type: "deposit" | "withdrawal",
  status?: TransactionStatus
): Promise<TransactionRow[]> {
  await requireRole("administrator");
  const db = createAdminClient();

  let query = db
    .from("transactions")
    .select("*")
    .eq("type", type)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as TransactionRow[];
}

function mapAdminDeposit(
  row: TransactionRow & {
    profile: ProfileRow | null;
    fund: FundRow | null;
  }
): AdminDepositRequest {
  return {
    id: row.id,
    investorId: row.user_id,
    investorName: row.profile?.full_name ?? "Unknown",
    investorEmail: row.profile?.email ?? "",
    fundId: row.fund_id,
    fundName: row.fund?.name ?? "—",
    amount: toNumber(row.amount),
    paymentMethod: row.payment_method ?? "—",
    reference: row.reference,
    paymentProof: null,
    notes: row.notes,
    adminNotes: row.admin_notes,
    status: row.status as TransactionStatus,
    submittedAt: row.created_at,
    processedAt: row.processed_at,
    approvedBy: row.approved_by,
  };
}

function mapAdminWithdrawal(
  row: TransactionRow & {
    profile: ProfileRow | null;
    fund: FundRow | null;
    available_balance: number | null;
  }
): AdminWithdrawalRequest {
  return {
    id: row.id,
    investorId: row.user_id,
    investorName: row.profile?.full_name ?? "Unknown",
    investorEmail: row.profile?.email ?? "",
    fundId: row.fund_id,
    fundName: row.fund?.name ?? "—",
    amount: toNumber(row.amount),
    withdrawableBalance: row.available_balance ?? 0,
    destination: row.destination ?? row.reference ?? "—",
    notes: row.notes,
    adminNotes: row.admin_notes,
    status: row.status as TransactionStatus,
    submittedAt: row.created_at,
    processedAt: row.processed_at,
    approvedBy: row.approved_by,
  };
}

function mapAdminTransaction(
  row: TransactionRow & { profile: ProfileRow | null; fund: FundRow | null }
): AdminTransaction {
  return {
    id: row.id,
    investorName: row.profile?.full_name ?? "Unknown",
    fundName: row.fund?.name ?? "—",
    type: row.type as AdminTransaction["type"],
    amount: toNumber(row.amount),
    status: row.status as TransactionStatus,
    reference: row.reference,
    createdAt: row.created_at,
    processedAt: row.processed_at,
  };
}

function parseCryptoFromNotes(notes: string | null): {
  symbol: string | null;
  network: string | null;
} {
  if (!notes?.includes("Crypto deposit")) {
    return { symbol: null, network: null };
  }
  const match = notes.match(/Crypto deposit — (\w+) on (\w+)/);
  if (!match) return { symbol: null, network: null };
  return { symbol: match[1] ?? null, network: match[2] ?? null };
}

function mapInvestorTransaction(
  row: TransactionRow,
  fundName: string,
  poolWinRate: number | null
): InvestorTransaction {
  const parsed = parseCryptoFromNotes(row.notes);
  return {
    id: row.id,
    type: row.type,
    amount: toNumber(row.amount),
    status: row.status,
    paymentMethod: row.payment_method,
    reference: row.reference,
    cryptoSymbol: row.crypto_symbol ?? parsed.symbol,
    cryptoNetwork: row.crypto_network ?? parsed.network,
    cryptoAmount:
      row.crypto_amount != null ? toNumber(row.crypto_amount) : toNumber(row.amount),
    fundName,
    poolWinRate,
    createdAt: row.created_at,
    processedAt: row.processed_at,
  };
}

export const transactionService = {
  async getPendingCounts(): Promise<{
    pendingDeposits: number;
    pendingWithdrawals: number;
  }> {
    await requireRole("administrator");
    const db = createAdminClient();

    const [deposits, withdrawals] = await Promise.all([
      db
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("type", "deposit")
        .eq("status", "pending"),
      db
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("type", "withdrawal")
        .eq("status", "pending"),
    ]);

    return {
      pendingDeposits: deposits.count ?? 0,
      pendingWithdrawals: withdrawals.count ?? 0,
    };
  },

  async getInvestorTransactions(): Promise<InvestorTransaction[]> {
    const user = await requireAuth();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error || !data?.length) {
      return [];
    }

    const rows = data as TransactionRow[];
    const fundIds = [...new Set(rows.map((r) => r.fund_id))];
    const db = createAdminClient();

    const [fundsResult, statsResult] = await Promise.all([
      db.from("funds").select("id, name").in("id", fundIds),
      db.from("pool_stats").select("fund_id, win_rate").in("fund_id", fundIds),
    ]);

    const fundMap = new Map(
      ((fundsResult.data ?? []) as FundRow[]).map((f) => [f.id, f.name])
    );
    const winRateMap = new Map(
      ((statsResult.data ?? []) as PoolStatsRow[]).map((s) => [
        s.fund_id,
        toNumber(s.win_rate),
      ])
    );

    return rows.map((row) =>
      mapInvestorTransaction(
        row,
        fundMap.get(row.fund_id) ?? "—",
        winRateMap.get(row.fund_id) ?? null
      )
    );
  },

  async getAdminDeposits(
    status?: TransactionStatus
  ): Promise<AdminDepositRequest[]> {
    const rows = await fetchAdminTransactionsByType("deposit", status);
    const enriched = await enrichTransactions(rows);
    return enriched.map(mapAdminDeposit);
  },

  async getAdminWithdrawals(
    status?: TransactionStatus
  ): Promise<AdminWithdrawalRequest[]> {
    const rows = await fetchAdminTransactionsByType("withdrawal", status);
    const enriched = await enrichTransactions(rows);
    return enriched.map(mapAdminWithdrawal);
  },

  async getAdminTransactions(): Promise<AdminTransaction[]> {
    await requireRole("administrator");
    const db = createAdminClient();
    const { data, error } = await db
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const enriched = await enrichTransactions((data ?? []) as TransactionRow[]);
    return enriched.map(mapAdminTransaction);
  },

  async submitWithdrawal(input: {
    amount: number;
    destination: string;
    fundId?: string;
  }): Promise<{ id: string }> {
    const user = await requireAuth();
    const supabase = await createClient();
    const fundId = input.fundId ?? DEFAULT_FUND_ID;

    if (!input.destination.trim()) {
      throw new Error("Withdrawal destination is required.");
    }

    const db = createAdminClient();
    const { data: portfolio } = await db
      .from("investor_portfolios")
      .select("available_balance")
      .eq("user_id", user.id)
      .eq("fund_id", fundId)
      .maybeSingle();

    const available = toNumber(
      (portfolio as { available_balance?: number } | null)?.available_balance
    );

    if (input.amount > available) {
      throw new Error("Insufficient available balance.");
    }

    const { error: reserveError } = await db
      .from("investor_portfolios")
      .update({ available_balance: available - input.amount } as never)
      .eq("user_id", user.id)
      .eq("fund_id", fundId);

    if (reserveError) {
      throw new Error(reserveError.message);
    }

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        fund_id: fundId,
        type: "withdrawal",
        amount: input.amount,
        status: "pending",
        payment_method: "bank",
        destination: input.destination.trim(),
        notes: `Withdrawal request to ${input.destination.trim()}`,
      } as never)
      .select("id")
      .single();

    if (error || !data) {
      await db
        .from("investor_portfolios")
        .update({ available_balance: available } as never)
        .eq("user_id", user.id)
        .eq("fund_id", fundId);
      throw new Error(error?.message ?? "Failed to submit withdrawal.");
    }

    const txId = (data as { id: string }).id;
    await communicationTriggers.withdrawalRequested({
      userId: user.id,
      amount: formatMoney(input.amount),
      transactionId: txId,
    });
    await adminNotifyService.newWithdrawal({
      amount: formatMoney(input.amount),
      userName: user.email ?? user.id,
      transactionId: txId,
      triggeredBy: user.id,
    });

    return { id: txId };
  },

  async approveDeposit(transactionId: string): Promise<void> {
    const admin = await requireRole("administrator");
    const db = createAdminClient();

    const { data: tx, error: fetchError } = await db
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .eq("type", "deposit")
      .maybeSingle();

    if (fetchError || !tx) {
      throw new Error("Deposit not found.");
    }

    const row = tx as TransactionRow;
    if (row.status !== "pending") {
      throw new Error("Only pending deposits can be approved.");
    }

    const amount = toNumber(row.amount);
    const now = new Date().toISOString();

    const { error: updateError } = await db
      .from("transactions")
      .update({
        status: "approved",
        processed_at: now,
        processed_by: admin.id,
        approved_by: admin.id,
      } as never)
      .eq("id", transactionId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    const { data: challengeEnrollment } = await db
      .from("trader_challenge_enrollments")
      .select("id, challenge_id, amount_paid")
      .eq("user_id", row.user_id)
      .eq("status", "pending_payment")
      .eq("payment_method", "crypto")
      .maybeSingle();

    let balanceCredit = amount;
    if (challengeEnrollment) {
      const enrollRow = challengeEnrollment as {
        id: string;
        challenge_id: string;
        amount_paid?: number | string | null;
      };
      let challengeFee = toNumber(enrollRow.amount_paid);
      if (challengeFee <= 0) {
        const { data: challenge } = await db
          .from("trader_challenges")
          .select("price")
          .eq("id", enrollRow.challenge_id)
          .maybeSingle();
        challengeFee = toNumber((challenge as { price?: number | string } | null)?.price);
      }
      balanceCredit = Math.max(0, amount - challengeFee);
    }

    const { data: portfolio } = await db
      .from("investor_portfolios")
      .select("available_balance, total_deposits")
      .eq("user_id", row.user_id)
      .eq("fund_id", DEFAULT_FUND_ID)
      .maybeSingle();

    const portfolioRow = portfolio as {
      available_balance?: number;
      total_deposits?: number;
    } | null;

    const newBalance = toNumber(portfolioRow?.available_balance) + balanceCredit;
    const newTotalDeposits = toNumber(portfolioRow?.total_deposits) + amount;

    if (portfolioRow) {
      const { error: portfolioError } = await db
        .from("investor_portfolios")
        .update({
          available_balance: newBalance,
          total_deposits: newTotalDeposits,
          last_deposit_at: now,
        } as never)
        .eq("user_id", row.user_id)
        .eq("fund_id", DEFAULT_FUND_ID);

      if (portfolioError) {
        throw new Error(portfolioError.message);
      }
    } else {
      const { error: insertError } = await db
        .from("investor_portfolios")
        .insert({
          user_id: row.user_id,
          fund_id: DEFAULT_FUND_ID,
          available_balance: amount,
          total_deposits: amount,
          last_deposit_at: now,
        } as never);

      if (insertError) {
        throw new Error(insertError.message);
      }
    }

    await communicationTriggers.depositApproved({
      userId: row.user_id,
      amount: formatMoney(amount),
      transactionId,
      triggeredBy: admin.id,
    });

    const { data: challengeEnrollmentAfter } = await db
      .from("trader_challenge_enrollments")
      .select("id, challenge_id")
      .eq("user_id", row.user_id)
      .eq("status", "pending_payment")
      .eq("payment_method", "crypto")
      .maybeSingle();

    if (challengeEnrollmentAfter) {
      const enrollRow = challengeEnrollmentAfter as { id: string; challenge_id: string };
      await db
        .from("trader_challenge_enrollments")
        .update({
          status: "awaiting_setup",
          updated_at: now,
        } as never)
        .eq("id", enrollRow.id);

      await communicationTriggers.legacyInApp({
        userId: row.user_id,
        templateSlug: "challenge_enrollment",
        notificationType: "pool_trading",
        title: "Challenge deposit confirmed",
        message:
          "Your crypto deposit was approved. Our team will send your challenge account and rules shortly.",
        metadata: { challenge_id: enrollRow.challenge_id },
        relatedEntityType: "challenge_enrollment",
        relatedEntityId: enrollRow.id,
        triggeredBy: admin.id,
      });
    }
  },

  async rejectDeposit(
    transactionId: string,
    adminNotes?: string
  ): Promise<void> {
    const admin = await requireRole("administrator");
    const db = createAdminClient();

    const { data: tx } = await db
      .from("transactions")
      .select("id, status, user_id")
      .eq("id", transactionId)
      .eq("type", "deposit")
      .maybeSingle();

    if (!tx) {
      throw new Error("Deposit not found.");
    }

    const row = tx as { id: string; status: string; user_id: string };
    if (row.status !== "pending") {
      throw new Error("Only pending deposits can be rejected.");
    }

    const now = new Date().toISOString();
    const { error } = await db
      .from("transactions")
      .update({
        status: "rejected",
        processed_at: now,
        processed_by: admin.id,
        admin_notes: adminNotes?.trim() || null,
      } as never)
      .eq("id", transactionId);

    if (error) {
      throw new Error(error.message);
    }

    await communicationTriggers.depositRejected({
      userId: row.user_id,
      transactionId,
      triggeredBy: admin.id,
    });
  },

  async approveWithdrawal(transactionId: string): Promise<void> {
    const admin = await requireRole("administrator");
    const db = createAdminClient();

    const { data: tx } = await db
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .eq("type", "withdrawal")
      .maybeSingle();

    if (!tx) {
      throw new Error("Withdrawal not found.");
    }

    const row = tx as TransactionRow;
    if (row.status !== "pending") {
      throw new Error("Only pending withdrawals can be approved.");
    }

    const amount = toNumber(row.amount);
    const now = new Date().toISOString();

    const { data: portfolio } = await db
      .from("investor_portfolios")
      .select("total_withdrawals")
      .eq("user_id", row.user_id)
      .eq("fund_id", row.fund_id)
      .maybeSingle();

    const portfolioRow = portfolio as { total_withdrawals?: number } | null;

    const { error: updateError } = await db
      .from("transactions")
      .update({
        status: "approved",
        processed_at: now,
        processed_by: admin.id,
        approved_by: admin.id,
      } as never)
      .eq("id", transactionId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (portfolioRow) {
      await db
        .from("investor_portfolios")
        .update({
          total_withdrawals: toNumber(portfolioRow.total_withdrawals) + amount,
        } as never)
        .eq("user_id", row.user_id)
        .eq("fund_id", row.fund_id);
    }

    await communicationTriggers.withdrawalApproved({
      userId: row.user_id,
      amount: formatMoney(amount),
      transactionId,
      triggeredBy: admin.id,
    });
  },

  async rejectWithdrawal(
    transactionId: string,
    adminNotes?: string
  ): Promise<void> {
    const admin = await requireRole("administrator");
    const db = createAdminClient();

    const { data: tx } = await db
      .from("transactions")
      .select("id, status, user_id, fund_id, amount")
      .eq("id", transactionId)
      .eq("type", "withdrawal")
      .maybeSingle();

    if (!tx) {
      throw new Error("Withdrawal not found.");
    }

    const row = tx as {
      id: string;
      status: string;
      user_id: string;
      fund_id: string;
      amount: number | string;
    };
    if (row.status !== "pending") {
      throw new Error("Only pending withdrawals can be rejected.");
    }

    const amount = toNumber(row.amount);
    const now = new Date().toISOString();
    const { error } = await db
      .from("transactions")
      .update({
        status: "rejected",
        processed_at: now,
        processed_by: admin.id,
        admin_notes: adminNotes?.trim() || null,
      } as never)
      .eq("id", transactionId);

    if (error) {
      throw new Error(error.message);
    }

    const { data: portfolio } = await db
      .from("investor_portfolios")
      .select("available_balance")
      .eq("user_id", row.user_id)
      .eq("fund_id", row.fund_id)
      .maybeSingle();

    const available = toNumber(
      (portfolio as { available_balance?: number } | null)?.available_balance
    );

    await db
      .from("investor_portfolios")
      .update({ available_balance: available + amount } as never)
      .eq("user_id", row.user_id)
      .eq("fund_id", row.fund_id);

    await communicationTriggers.withdrawalRejected({
      userId: row.user_id,
      transactionId,
      triggeredBy: admin.id,
    });
  },
};
