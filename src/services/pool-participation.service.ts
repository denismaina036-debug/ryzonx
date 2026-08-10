import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_FUND_ID } from "@/constants/funds";
import { isValidPoolId } from "@/lib/pool/resolve-pool-id";
import { requireAuth } from "@/lib/auth/session";
import { communicationTriggers } from "@/services/communication";
import { formatMoney } from "@/services/communication/user-variables";
import { isPoolJoinBlocked } from "@/lib/governance/protection-indicators";
import { investmentCycleService } from "@/services/investment-cycle.service";
import { investmentAllocationService } from "@/services/investment-allocation.service";
import { attachTransactionReference } from "@/lib/transaction/insert";
import { roundMoney } from "@/lib/investment-engine/ownership";
import { auditService } from "@/services/audit.service";
import type {
  ParticipatablePool,
  PoolParticipationPageData,
} from "@/features/investor/types/pool-participation";

export type { ParticipatablePool, PoolParticipationPageData };

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function assertDb<T>(
  result: { data: T; error: { message: string } | null },
  fallback: string
): T {
  if (result.error) {
    throw new Error(result.error.message ?? fallback);
  }
  return result.data;
}

type FundRow = {
  id: string;
  name: string;
  description: string | null;
  pool_description: string | null;
  trading_pair: string | null;
  pool_duration_days: number | null;
  min_investment: number;
  max_investment: number | null;
  target_capital: number | null;
  current_capital: number | null;
  profit_target_pct: number | null;
  target_investors: number | null;
  current_roi: number;
  is_invite_only: boolean;
  status: string;
  card_background_color: string | null;
  pool_manager_name: string | null;
  pool_manager_icon_url: string | null;
  investor_capital?: number;
  ryvonx_capital?: number;
  pool_health?: string;
  governance_stage?: string;
  on_probation?: boolean;
  pause_new_investments?: boolean;
  lifecycle_status?: string;
};

type PortfolioRow = {
  total_invested?: number;
  current_value?: number;
  total_deposits?: number;
  available_balance?: number;
  realized_pnl?: number;
  unrealized_pnl?: number;
  investment_start_date?: string | null;
  investment_maturity_date?: string | null;
};

function poolProfitAmount(row: PortfolioRow): number {
  const realized = toNumber(row.realized_pnl);
  const unrealized = toNumber(row.unrealized_pnl);
  const fromPnL = realized + unrealized;
  const fromValue = toNumber(row.current_value) - toNumber(row.total_invested);
  return Math.max(0, fromPnL > 0 ? fromPnL : fromValue);
}

function applyProfitReduction(
  realized: number,
  unrealized: number,
  amount: number
): { newRealized: number; newUnrealized: number; applied: number } {
  const available = Math.max(0, realized + unrealized);
  if (amount <= 0) {
    throw new Error("Amount must be greater than zero.");
  }
  if (amount > available + 0.005) {
    throw new Error("Amount exceeds available pool profit.");
  }

  const fromRealized = Math.min(amount, Math.max(0, realized));
  const fromUnrealized = Math.min(amount - fromRealized, Math.max(0, unrealized));

  return {
    newRealized: Math.round((realized - fromRealized) * 100) / 100,
    newUnrealized: Math.round((unrealized - fromUnrealized) * 100) / 100,
    applied: Math.round((fromRealized + fromUnrealized) * 100) / 100,
  };
}

async function getPoolParticipation(
  db: ReturnType<typeof createAdminClient>,
  userId: string,
  fundId: string
): Promise<PortfolioRow> {
  const { data, error } = await db
    .from("investor_portfolios")
    .select(
      "total_invested, current_value, total_deposits, available_balance, realized_pnl, unrealized_pnl, investment_start_date, investment_maturity_date"
    )
    .eq("user_id", userId)
    .eq("fund_id", fundId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const row = data as PortfolioRow | null;
  if (!row || toNumber(row.total_invested) <= 0) {
    throw new Error("You are not participating in this pool.");
  }

  return row;
}

async function ensureWalletPortfolio(
  db: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<PortfolioRow & { fund_id: string }> {
  const { data: existing, error: readError } = await db
    .from("investor_portfolios")
    .select(
      "fund_id, available_balance, total_invested, current_value, total_deposits, investment_start_date, investment_maturity_date"
    )
    .eq("user_id", userId)
    .eq("fund_id", DEFAULT_FUND_ID)
    .maybeSingle();

  if (readError) {
    throw new Error(readError.message);
  }

  if (existing) {
    return existing as PortfolioRow & { fund_id: string };
  }

  const { data: created, error: insertError } = await db
    .from("investor_portfolios")
    .insert({
      user_id: userId,
      fund_id: DEFAULT_FUND_ID,
      available_balance: 0,
      total_invested: 0,
      current_value: 0,
      total_deposits: 0,
    } as never)
    .select(
      "fund_id, available_balance, total_invested, current_value, total_deposits, investment_start_date, investment_maturity_date"
    )
    .single();

  if (insertError || !created) {
    throw new Error(insertError?.message ?? "Could not initialize wallet.");
  }

  return created as PortfolioRow & { fund_id: string };
}

export const poolParticipationService = {
  async getPageData(): Promise<PoolParticipationPageData> {
    const user = await requireAuth();
    const db = createAdminClient();

    const [portfolioResult, fundsResult, invitesResult] = await Promise.all([
      db
        .from("investor_portfolios")
        .select("available_balance")
        .eq("user_id", user.id)
        .eq("fund_id", DEFAULT_FUND_ID)
        .maybeSingle(),
      db.from("funds").select("*").eq("status", "active").order("name"),
      db
        .from("pool_invitations")
        .select("fund_id, status")
        .eq("user_id", user.id),
    ]);

    const portfolio = portfolioResult.data as { available_balance?: number } | null;
    const fundRows = (fundsResult.data ?? []) as FundRow[];
    const invites = new Set(
      ((invitesResult.data ?? []) as Array<{ fund_id: string }>).map((i) => i.fund_id)
    );

    const pools = fundRows
      .filter((f) => !f.is_invite_only || invites.has(f.id))
      .map((f) => ({
        id: f.id,
        name: f.name,
        description: f.description ?? "",
        poolDescription: f.pool_description ?? f.description ?? "",
        tradingPair: f.trading_pair ?? "Multi-pair",
        poolDurationDays: f.pool_duration_days,
        minInvestment: toNumber(f.min_investment),
        maxInvestment: f.max_investment != null ? toNumber(f.max_investment) : null,
        targetCapital: toNumber(f.target_capital),
        currentCapital: toNumber(f.current_capital),
        profitTargetPct: toNumber(f.profit_target_pct),
        targetInvestors: f.target_investors ?? 0,
        currentRoi: toNumber(f.current_roi),
        isInviteOnly: f.is_invite_only,
        isInvited: invites.has(f.id),
        cardBackgroundColor: f.card_background_color ?? null,
        poolManagerName: f.pool_manager_name ?? null,
        poolManagerIconUrl: f.pool_manager_icon_url ?? null,
        status: f.status,
      }));

    return {
      availableBalance: toNumber(portfolio?.available_balance),
      pools,
    };
  },

  async joinPool(fundId: string, amount: number): Promise<void> {
    const user = await requireAuth();

    if (!isValidPoolId(fundId)) {
      throw new Error("Invalid pool.");
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Invalid investment amount.");
    }

    const poolId = fundId;
    const db = createAdminClient();

    const { data: fund, error: fundError } = await db
      .from("funds")
      .select("*")
      .eq("id", poolId)
      .maybeSingle();

    if (fundError) {
      throw new Error(fundError.message);
    }

    const fundRow = fund as FundRow | null;
    if (!fundRow || fundRow.status !== "active") {
      throw new Error("Pool is not available.");
    }

    const joinBlock = isPoolJoinBlocked({
      pool_health: fundRow.pool_health as string | undefined,
      governance_stage: fundRow.governance_stage as string | undefined,
      on_probation: Boolean(fundRow.on_probation),
      pause_new_investments: Boolean(fundRow.pause_new_investments),
      lifecycle_status: fundRow.lifecycle_status as string | undefined,
      status: fundRow.status,
    });
    if (joinBlock) throw new Error(joinBlock);

    if (fundRow.is_invite_only) {
      const { data: invite } = await db
        .from("pool_invitations")
        .select("id")
        .eq("fund_id", poolId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!invite) throw new Error("This pool is invite-only.");
    }

    if (amount < toNumber(fundRow.min_investment)) {
      throw new Error(
        `Minimum investment for ${fundRow.name} is $${toNumber(fundRow.min_investment).toLocaleString()}.`
      );
    }

    if (fundRow.max_investment != null && amount > toNumber(fundRow.max_investment)) {
      throw new Error(
        `Maximum investment for ${fundRow.name} is $${toNumber(fundRow.max_investment).toLocaleString()}.`
      );
    }

    const walletPortfolio = await ensureWalletPortfolio(db, user.id);
    const available = toNumber(walletPortfolio.available_balance);

    if (amount > available) {
      throw new Error("Insufficient available balance. Deposit and wait for approval first.");
    }

    const now = new Date().toISOString();
    const startDate = new Date().toISOString().slice(0, 10);
    const maturityDate =
      fundRow.pool_duration_days != null && fundRow.pool_duration_days > 0
        ? new Date(Date.now() + fundRow.pool_duration_days * 86400000)
            .toISOString()
            .slice(0, 10)
        : null;

    const { data: poolPortfolio, error: poolReadError } = await db
      .from("investor_portfolios")
      .select(
        "total_invested, current_value, total_deposits, investment_start_date, investment_maturity_date"
      )
      .eq("user_id", user.id)
      .eq("fund_id", poolId)
      .maybeSingle();

    if (poolReadError) {
      throw new Error(poolReadError.message);
    }

    const poolRow = poolPortfolio as PortfolioRow | null;
    const isNewParticipant = !poolRow || toNumber(poolRow.total_invested) <= 0;
    const nextInvested = toNumber(poolRow?.total_invested) + amount;
    const nextValue = toNumber(poolRow?.current_value) + amount;

    if (poolId === DEFAULT_FUND_ID) {
      assertDb(
        await db
          .from("investor_portfolios")
          .update({
            available_balance: available - amount,
            total_invested: nextInvested,
            current_value: nextValue,
            total_deposits: toNumber(walletPortfolio.total_deposits) + amount,
            investment_start_date: poolRow?.investment_start_date ?? startDate,
            investment_maturity_date: poolRow?.investment_maturity_date ?? maturityDate,
            investment_duration_days: fundRow.pool_duration_days,
            last_deposit_at: now,
          } as never)
          .eq("user_id", user.id)
          .eq("fund_id", DEFAULT_FUND_ID)
          .select("user_id")
          .single(),
        "Could not allocate investment to pool."
      );
    } else {
      assertDb(
        await db
          .from("investor_portfolios")
          .update({ available_balance: available - amount } as never)
          .eq("user_id", user.id)
          .eq("fund_id", DEFAULT_FUND_ID)
          .select("user_id")
          .single(),
        "Could not deduct wallet balance."
      );

      if (poolRow) {
        assertDb(
          await db
            .from("investor_portfolios")
            .update({
              total_invested: nextInvested,
              current_value: nextValue,
              total_deposits: toNumber(poolRow.total_deposits) + amount,
              investment_start_date: poolRow.investment_start_date ?? startDate,
              investment_maturity_date: poolRow.investment_maturity_date ?? maturityDate,
              investment_duration_days: fundRow.pool_duration_days,
              last_deposit_at: now,
            } as never)
            .eq("user_id", user.id)
            .eq("fund_id", poolId)
            .select("user_id")
            .single(),
          "Could not update pool allocation."
        );
      } else {
        assertDb(
          await db
            .from("investor_portfolios")
            .insert({
              user_id: user.id,
              fund_id: poolId,
              total_invested: amount,
              current_value: amount,
              total_deposits: amount,
              investment_start_date: startDate,
              investment_maturity_date: maturityDate,
              investment_duration_days: fundRow.pool_duration_days,
              last_deposit_at: now,
            } as never)
            .select("user_id")
            .single(),
          "Could not create pool allocation."
        );
      }
    }

    const { data: fundBeforeJoin } = await db
      .from("funds")
      .select("current_capital, active_investors, investor_capital")
      .eq("id", poolId)
      .maybeSingle();

    const fundStats = fundBeforeJoin as {
      current_capital?: number;
      active_investors?: number;
      investor_capital?: number;
    } | null;

    const activeCycle = await investmentCycleService.getActiveForFund(poolId);
    const queueDuringTrading =
      activeCycle &&
      (activeCycle.status === "trading" || activeCycle.status === "distribution");

    if (queueDuringTrading) {
      const { investmentQueueService } = await import(
        "@/services/investment-engine/investment-queue.service"
      );
      await investmentQueueService.enqueue({
        fundId: poolId,
        investorId: user.id,
        queueType: "investment",
        amount,
        targetCycleId: activeCycle.id,
        notes: `Queued during ${activeCycle.status}`,
      });

      const { data: txData, error: txError } = await db.from("transactions").insert({
        user_id: user.id,
        fund_id: poolId,
        type: "adjustment",
        amount,
        status: "pending",
        payment_method: "pool_allocation",
        notes: `Queued investment in ${fundRow.name} (cycle ${activeCycle.name})`,
      } as never)
        .select("id")
        .single();

      if (txError || !txData) {
        throw new Error(txError?.message ?? "Failed to record queued allocation.");
      }

      await attachTransactionReference(db, (txData as { id: string }).id, {
        type: "adjustment",
        payment_method: "pool_allocation",
        notes: `Queued investment in ${fundRow.name}`,
      });

      await communicationTriggers.poolInvestmentConfirmed({
        userId: user.id,
        amount: formatMoney(amount),
        poolName: fundRow.name,
        poolId,
      });

      await db
        .from("pool_invitations")
        .update({ status: "accepted" } as never)
        .eq("fund_id", poolId)
        .eq("user_id", user.id);
      return;
    }

    const { poolCapitalService } = await import(
      "@/services/investment-engine/pool-capital.service"
    );
    await poolCapitalService.applyInvestment(poolId, user.id, amount);
    const poolCapitalTotal = await poolCapitalService.getPoolCapitalTotal(poolId);

    assertDb(
      await db
        .from("funds")
        .update({
          current_capital: toNumber(fundStats?.current_capital) + amount,
          investor_capital: poolCapitalTotal,
          active_investors:
            toNumber(fundStats?.active_investors) + (isNewParticipant ? 1 : 0),
        } as never)
        .eq("id", poolId)
        .select("id")
        .single(),
      "Could not update pool statistics."
    );

    // Only attach explicit marketplace joins during an open funding cycle.
    if (activeCycle && (activeCycle.status === "funding" || activeCycle.status === "approved")) {
      await investmentAllocationService.recordMarketplaceJoin({
        cycleId: activeCycle.id,
        investorId: user.id,
        amount,
      });
    }

    const { data: txData, error: txError } = await db.from("transactions").insert({
      user_id: user.id,
      fund_id: poolId,
      type: "adjustment",
      amount,
      status: "completed",
      payment_method: "pool_allocation",
      notes: `Allocated to ${fundRow.name}`,
    } as never).select("id").single();

    if (txError || !txData) {
      throw new Error(txError?.message ?? "Failed to record allocation.");
    }

    await attachTransactionReference(db, (txData as { id: string }).id, {
      type: "adjustment",
      payment_method: "pool_allocation",
      notes: `Allocated to ${fundRow.name}`,
    });

    await communicationTriggers.poolInvestmentConfirmed({
      userId: user.id,
      amount: formatMoney(amount),
      poolName: fundRow.name,
      poolId,
    });

    await db
      .from("pool_invitations")
      .update({ status: "accepted" } as never)
      .eq("fund_id", poolId)
      .eq("user_id", user.id);
  },

  async leavePool(fundId: string): Promise<void> {
    const user = await requireAuth();

    if (!isValidPoolId(fundId)) {
      throw new Error("Invalid pool.");
    }

    const poolId = fundId;
    const db = createAdminClient();

    const { data: portfolio } = await db
      .from("investor_portfolios")
      .select(
        "total_invested, current_value, investment_start_date, investment_maturity_date"
      )
      .eq("user_id", user.id)
      .eq("fund_id", poolId)
      .maybeSingle();

    const row = portfolio as {
      total_invested?: number;
      current_value?: number;
      investment_start_date?: string | null;
      investment_maturity_date?: string | null;
    } | null;

    const invested = toNumber(row?.total_invested);
    if (!row || invested <= 0) {
      throw new Error("You are not participating in this pool.");
    }

    const { data: fund } = await db
      .from("funds")
      .select("name, pool_duration_days, current_capital, active_investors")
      .eq("id", poolId)
      .maybeSingle();

    const fundRow = fund as {
      name: string;
      pool_duration_days: number | null;
      current_capital?: number;
      active_investors?: number;
    } | null;

    if (!fundRow) throw new Error("Pool not found.");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let termEnded = false;
    if (row.investment_maturity_date) {
      const end = new Date(row.investment_maturity_date);
      end.setHours(0, 0, 0, 0);
      termEnded = end.getTime() <= today.getTime();
    } else if (row.investment_start_date && fundRow.pool_duration_days) {
      const end = new Date(row.investment_start_date);
      end.setDate(end.getDate() + fundRow.pool_duration_days);
      end.setHours(0, 0, 0, 0);
      termEnded = end.getTime() <= today.getTime();
    }

    if (!termEnded) {
      const endLabel = row.investment_maturity_date
        ? new Date(row.investment_maturity_date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "the pool term end date";
      throw new Error(`You can only opt out after the pool term ends (${endLabel}).`);
    }

    const returnAmount = toNumber(row.current_value);
    const principal = invested;
    const profitReturned = Math.max(0, returnAmount - principal);

    const walletPortfolio = await ensureWalletPortfolio(db, user.id);
    const walletBalance = toNumber(walletPortfolio.available_balance);

    assertDb(
      await db
        .from("investor_portfolios")
        .update({ available_balance: walletBalance + returnAmount } as never)
        .eq("user_id", user.id)
        .eq("fund_id", DEFAULT_FUND_ID)
        .select("user_id")
        .single(),
      "Could not return funds to wallet."
    );

    if (poolId === DEFAULT_FUND_ID) {
      assertDb(
        await db
          .from("investor_portfolios")
          .update({
            total_invested: 0,
            current_value: 0,
            total_deposits: 0,
            unrealized_pnl: 0,
            realized_pnl: 0,
            ownership_percentage: 0,
            investment_start_date: null,
            investment_maturity_date: null,
            investment_duration_days: null,
          } as never)
          .eq("user_id", user.id)
          .eq("fund_id", DEFAULT_FUND_ID)
          .select("user_id")
          .single(),
        "Could not clear pool allocation."
      );
    } else {
      assertDb(
        await db
          .from("investor_portfolios")
          .update({
            total_invested: 0,
            current_value: 0,
            total_deposits: 0,
            unrealized_pnl: 0,
            realized_pnl: 0,
            ownership_percentage: 0,
            investment_start_date: null,
            investment_maturity_date: null,
            investment_duration_days: null,
          } as never)
          .eq("user_id", user.id)
          .eq("fund_id", poolId)
          .select("user_id")
          .single(),
        "Could not clear pool allocation."
      );
    }

    await db
      .from("funds")
      .update({
        current_capital: Math.max(0, toNumber(fundRow.current_capital) - invested),
        active_investors: Math.max(0, toNumber(fundRow.active_investors) - 1),
      } as never)
      .eq("id", poolId);

    const activeCycle = await investmentCycleService.getActiveForFund(poolId);
    if (activeCycle) {
      await investmentAllocationService.cancelMarketplaceParticipation({
        cycleId: activeCycle.id,
        investorId: user.id,
      });
    }

    const exitNotes = profitReturned > 0
      ? `Opted out of ${fundRow.name} — principal and profit returned to Funding Wallet`
      : `Opted out of ${fundRow.name} — principal returned to Funding Wallet`;

    const { data: exitTx, error: exitTxError } = await db.from("transactions").insert({
      user_id: user.id,
      fund_id: poolId,
      type: "adjustment",
      amount: returnAmount,
      status: "completed",
      payment_method: "pool_exit",
      notes: exitNotes,
    } as never).select("id").single();

    if (exitTxError || !exitTx) {
      throw new Error(exitTxError?.message ?? "Failed to record pool exit.");
    }

    await attachTransactionReference(db, (exitTx as { id: string }).id, {
      type: "adjustment",
      payment_method: "pool_exit",
      notes: exitNotes,
    });

    await communicationTriggers.investmentClosed({
      userId: user.id,
      poolName: fundRow.name,
      poolId,
    });
    await communicationTriggers.investmentUpdated({
      userId: user.id,
      poolName: fundRow.name,
      message: `$${returnAmount.toLocaleString()} from ${fundRow.name} has been returned to your Funding Wallet.`,
      poolId,
    });
  },

  async transferProfitToWallet(
    fundId: string,
    amount?: number
  ): Promise<{ transferred: number; poolName: string }> {
    const user = await requireAuth();

    if (!isValidPoolId(fundId)) {
      throw new Error("Invalid pool.");
    }

    const db = createAdminClient();
    const { investorProfitWalletService } = await import(
      "@/services/investment-engine/investor-profit-wallet.service"
    );

    const { data: fund } = await db.from("funds").select("name").eq("id", fundId).maybeSingle();
    const poolName = (fund as { name?: string } | null)?.name ?? "Pool";

    const profitWallet = await investorProfitWalletService.getOrCreate(user.id, fundId);
    let availableProfit = profitWallet.balance;
    if (availableProfit <= 0) {
      const poolRow = await getPoolParticipation(db, user.id, fundId);
      availableProfit = poolProfitAmount(poolRow);
    }

    if (availableProfit <= 0) {
      throw new Error("No pool profit available to transfer.");
    }

    const transferAmount =
      amount != null && Number.isFinite(amount) ? amount : availableProfit;
    if (transferAmount > availableProfit) {
      throw new Error("Amount exceeds available pool profit.");
    }

    const applied = transferAmount;
    const usesProfitWallet = profitWallet.balance >= applied;

    if (usesProfitWallet) {
      await investorProfitWalletService.debit(user.id, fundId, applied);
      const { ledgerAccountService } = await import("@/services/ledger-account.service");
      const { ledgerService } = await import("@/services/ledger.service");
      const poolProfitAccount = await ledgerAccountService.ensureInvestorPoolProfitAccount(
        user.id,
        fundId,
        poolName
      );
      const investorAccounts = await ledgerAccountService.ensureInvestorAccounts(user.id);
      await ledgerService.postTransaction({
        description: `Pool profit transferred to Funding Wallet — ${poolName}`,
        transactionType: "transfer",
        sourceType: "investor_profit_wallet",
        sourceId: fundId,
        actorId: user.id,
        entries: [
          {
            accountId: poolProfitAccount.id,
            entrySide: "debit",
            amount: applied,
            memo: "Pool profit released to Funding Wallet",
          },
          {
            accountId: investorAccounts.available.id,
            entrySide: "credit",
            amount: applied,
            memo: "Pool profit transferred to Funding Wallet",
          },
        ],
      });
      const walletPortfolio = await ensureWalletPortfolio(db, user.id);
      const walletBalance = toNumber(walletPortfolio.available_balance);
      assertDb(
        await db
          .from("investor_portfolios")
          .update({ available_balance: walletBalance + applied } as never)
          .eq("user_id", user.id)
          .eq("fund_id", DEFAULT_FUND_ID)
          .select("user_id")
          .single(),
        "Could not credit Funding Wallet."
      );
      const poolRow = await getPoolParticipation(db, user.id, fundId);
      if (poolRow) {
        const invested = toNumber(poolRow.total_invested);
        const remainingProfit = (await investorProfitWalletService.getOrCreate(user.id, fundId))
          .balance;
        await db
          .from("investor_portfolios")
          .update({
            current_value: roundMoney(invested + remainingProfit),
            realized_pnl: 0,
            unrealized_pnl: 0,
          } as never)
          .eq("user_id", user.id)
          .eq("fund_id", fundId);
      }
    } else {
      const poolRow = await getPoolParticipation(db, user.id, fundId);
      const realized = toNumber(poolRow.realized_pnl);
      const unrealized = toNumber(poolRow.unrealized_pnl);
      const { newRealized, newUnrealized, applied: legacyApplied } = applyProfitReduction(
        realized,
        unrealized,
        transferAmount
      );
      const nextPoolValue = toNumber(poolRow.current_value) - legacyApplied;

      if (fundId === DEFAULT_FUND_ID) {
        const walletBalance = toNumber(poolRow.available_balance);
        assertDb(
          await db
            .from("investor_portfolios")
            .update({
              current_value: nextPoolValue,
              realized_pnl: newRealized,
              unrealized_pnl: newUnrealized,
              available_balance: walletBalance + legacyApplied,
            } as never)
            .eq("user_id", user.id)
            .eq("fund_id", DEFAULT_FUND_ID)
            .select("user_id")
            .single(),
          "Could not transfer pool profit to Funding Wallet."
        );
      } else {
        const walletPortfolio = await ensureWalletPortfolio(db, user.id);
        const walletBalance = toNumber(walletPortfolio.available_balance);
        assertDb(
          await db
            .from("investor_portfolios")
            .update({
              current_value: nextPoolValue,
              realized_pnl: newRealized,
              unrealized_pnl: newUnrealized,
            } as never)
            .eq("user_id", user.id)
            .eq("fund_id", fundId)
            .select("user_id")
            .single(),
          "Could not update pool profit."
        );
        assertDb(
          await db
            .from("investor_portfolios")
            .update({ available_balance: walletBalance + legacyApplied } as never)
            .eq("user_id", user.id)
            .eq("fund_id", DEFAULT_FUND_ID)
            .select("user_id")
            .single(),
          "Could not credit Funding Wallet."
        );
      }
    }

    const profitNotes = `Pool profit transferred to Funding Wallet — ${poolName}`;

    const { data: profitTx, error: profitTxError } = await db.from("transactions").insert({
      user_id: user.id,
      fund_id: fundId,
      type: "adjustment",
      amount: applied,
      status: "completed",
      payment_method: "profit_transfer",
      notes: profitNotes,
    } as never).select("id").single();

    if (profitTxError || !profitTx) {
      throw new Error(profitTxError?.message ?? "Failed to record profit transfer.");
    }

    await attachTransactionReference(db, (profitTx as { id: string }).id, {
      type: "adjustment",
      payment_method: "profit_transfer",
      notes: profitNotes,
    });

    await communicationTriggers.investmentUpdated({
      userId: user.id,
      poolName,
      message: `$${applied.toLocaleString()} from ${poolName} is now in your Funding Wallet.`,
      poolId: fundId,
    });

    return { transferred: applied, poolName };
  },

  async reinvestProfit(
    fundId: string,
    amount?: number
  ): Promise<{ reinvested: number; poolName: string }> {
    const user = await requireAuth();

    if (!isValidPoolId(fundId)) {
      throw new Error("Invalid pool.");
    }

    const db = createAdminClient();
    const { investorProfitWalletService } = await import(
      "@/services/investment-engine/investor-profit-wallet.service"
    );
    const { investmentQueueService } = await import(
      "@/services/investment-engine/investment-queue.service"
    );
    const { poolCapitalService } = await import(
      "@/services/investment-engine/pool-capital.service"
    );

    const { data: fund } = await db
      .from("funds")
      .select("name, current_capital, investor_capital")
      .eq("id", fundId)
      .maybeSingle();

    const fundRow = fund as {
      name?: string;
      current_capital?: number;
      investor_capital?: number;
    } | null;

    const poolName = fundRow?.name ?? "Pool";
    const profitWallet = await investorProfitWalletService.getOrCreate(user.id, fundId);
    let availableProfit = profitWallet.balance;
    if (availableProfit <= 0) {
      const poolRow = await getPoolParticipation(db, user.id, fundId);
      availableProfit = poolProfitAmount(poolRow);
    }

    if (availableProfit <= 0) {
      throw new Error("No pool profit available to reinvest.");
    }

    const reinvestAmount =
      amount != null && Number.isFinite(amount) ? amount : availableProfit;
    if (reinvestAmount > availableProfit) {
      throw new Error("Amount exceeds available pool profit.");
    }

    const activeCycle = await investmentCycleService.getActiveForFund(fundId);
    const queueDuringTrading =
      activeCycle &&
      (activeCycle.status === "trading" || activeCycle.status === "distribution");

    let applied = reinvestAmount;

    if (queueDuringTrading) {
      await investmentQueueService.enqueueReinvestment({
        fundId,
        investorId: user.id,
        amount: reinvestAmount,
        targetCycleId: activeCycle.id,
      });
    } else if (profitWallet.balance >= reinvestAmount) {
      await investorProfitWalletService.debit(user.id, fundId, reinvestAmount);
      await poolCapitalService.applyReinvestment(fundId, user.id, reinvestAmount);
      const poolCapitalTotal = await poolCapitalService.getPoolCapitalTotal(fundId);
      const poolRow = await getPoolParticipation(db, user.id, fundId);
      const nextInvested = toNumber(poolRow.total_invested) + reinvestAmount;
      assertDb(
        await db
          .from("investor_portfolios")
          .update({ total_invested: nextInvested } as never)
          .eq("user_id", user.id)
          .eq("fund_id", fundId)
          .select("user_id")
          .single(),
        "Could not update pool allocation."
      );
      if (fundRow) {
        await db
          .from("funds")
          .update({
            current_capital: toNumber(fundRow.current_capital) + reinvestAmount,
            investor_capital: poolCapitalTotal,
          } as never)
          .eq("id", fundId);
      }
    } else {
      const poolRow = await getPoolParticipation(db, user.id, fundId);
      const realized = toNumber(poolRow.realized_pnl);
      const unrealized = toNumber(poolRow.unrealized_pnl);
      const reduction = applyProfitReduction(realized, unrealized, reinvestAmount);
      applied = reduction.applied;
      const nextInvested = toNumber(poolRow.total_invested) + applied;

      assertDb(
        await db
          .from("investor_portfolios")
          .update({
            total_invested: nextInvested,
            realized_pnl: reduction.newRealized,
            unrealized_pnl: reduction.newUnrealized,
          } as never)
          .eq("user_id", user.id)
          .eq("fund_id", fundId)
          .select("user_id")
          .single(),
        "Could not reinvest pool profit."
      );

      await poolCapitalService.applyReinvestment(fundId, user.id, applied);
      const poolCapitalTotal = await poolCapitalService.getPoolCapitalTotal(fundId);

      if (fundRow) {
        await db
          .from("funds")
          .update({
            current_capital: toNumber(fundRow.current_capital) + applied,
            investor_capital: poolCapitalTotal,
          } as never)
          .eq("id", fundId);
      }
    }

    const reinvestNotes = queueDuringTrading
      ? `Pool profit reinvestment queued — ${poolName}`
      : `Pool profit reinvested — ${poolName}`;

    const { data: reinvestTx, error: reinvestTxError } = await db.from("transactions").insert({
      user_id: user.id,
      fund_id: fundId,
      type: "adjustment",
      amount: applied,
      status: queueDuringTrading ? "pending" : "completed",
      payment_method: "profit_reinvest",
      notes: reinvestNotes,
    } as never)
      .select("id")
      .single();

    if (reinvestTxError || !reinvestTx) {
      throw new Error(reinvestTxError?.message ?? "Failed to record reinvestment.");
    }

    await attachTransactionReference(db, (reinvestTx as { id: string }).id, {
      type: "adjustment",
      payment_method: "profit_reinvest",
      notes: reinvestNotes,
    });

    await communicationTriggers.investmentUpdated({
      userId: user.id,
      poolName,
      message: queueDuringTrading
        ? `$${applied.toLocaleString()} from ${poolName} profit is queued for reinvestment.`
        : `$${applied.toLocaleString()} from ${poolName} profit was added back to your pool capital.`,
      poolId: fundId,
    });

    return { reinvested: applied, poolName };
  },

  /**
   * Return all investor capital from a pool to funding wallets (pool deletion / closure).
   */
  async liquidatePoolForDeletion(
    poolId: string,
    actorUserId: string
  ): Promise<{ returnedTotal: number; investorCount: number }> {
    if (poolId === DEFAULT_FUND_ID) {
      throw new Error("The default funding pool cannot be liquidated.");
    }

    const db = createAdminClient();
    const { data: fundRow, error: fundError } = await db
      .from("funds")
      .select("id, name, current_capital, active_investors, investor_capital")
      .eq("id", poolId)
      .maybeSingle();

    if (fundError || !fundRow) throw new Error("Pool not found.");
    const fund = fundRow as {
      id: string;
      name: string;
      current_capital: number;
      active_investors: number;
      investor_capital: number;
    };

    const { data: portfolios, error: portfolioError } = await db
      .from("investor_portfolios")
      .select("user_id, total_invested, current_value")
      .eq("fund_id", poolId)
      .gt("total_invested", 0);

    if (portfolioError) throw new Error(portfolioError.message);

    let returnedTotal = 0;
    const rows = (portfolios ?? []) as Array<{
      user_id: string;
      total_invested: number;
      current_value: number;
    }>;

    const activeCycle = await investmentCycleService.getActiveForFund(poolId);

    for (const row of rows) {
      const returnAmount = toNumber(row.current_value);
      if (returnAmount <= 0) continue;

      const walletPortfolio = await ensureWalletPortfolio(db, row.user_id);
      const walletBalance = toNumber(walletPortfolio.available_balance);

      assertDb(
        await db
          .from("investor_portfolios")
          .update({ available_balance: walletBalance + returnAmount } as never)
          .eq("user_id", row.user_id)
          .eq("fund_id", DEFAULT_FUND_ID)
          .select("user_id")
          .single(),
        "Could not return funds to wallet."
      );

      assertDb(
        await db
          .from("investor_portfolios")
          .update({
            total_invested: 0,
            current_value: 0,
            total_deposits: 0,
            unrealized_pnl: 0,
            realized_pnl: 0,
            ownership_percentage: 0,
            investment_start_date: null,
            investment_maturity_date: null,
            investment_duration_days: null,
          } as never)
          .eq("user_id", row.user_id)
          .eq("fund_id", poolId)
          .select("user_id")
          .single(),
        "Could not clear pool allocation."
      );

      if (activeCycle) {
        await investmentAllocationService.cancelMarketplaceParticipation({
          cycleId: activeCycle.id,
          investorId: row.user_id,
        });
      }

      const exitNotes = `Pool closed — ${fund.name} capital returned to Funding Wallet`;
      const { data: exitTx, error: exitTxError } = await db
        .from("transactions")
        .insert({
          user_id: row.user_id,
          fund_id: poolId,
          type: "adjustment",
          amount: returnAmount,
          status: "completed",
          payment_method: "pool_exit",
          notes: exitNotes,
        } as never)
        .select("id")
        .single();

      if (exitTxError || !exitTx) {
        throw new Error(exitTxError?.message ?? "Failed to record pool exit.");
      }

      await attachTransactionReference(db, (exitTx as { id: string }).id, {
        type: "adjustment",
        payment_method: "pool_exit",
        notes: exitNotes,
      });

      returnedTotal += returnAmount;
    }

    await db
      .from("funds")
      .update({
        current_capital: 0,
        investor_capital: 0,
        active_investors: 0,
        is_marketplace_listed: false,
        lifecycle_status: "archived",
        status: "archived",
      } as never)
      .eq("id", poolId);

    await auditService.log({
      actorId: actorUserId,
      action: "pool_liquidated",
      entityType: "fund",
      entityId: poolId,
      newValues: { returnedTotal, investorCount: rows.length, poolName: fund.name },
    });

    return { returnedTotal, investorCount: rows.length };
  },
};
