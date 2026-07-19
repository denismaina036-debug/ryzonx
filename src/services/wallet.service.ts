import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_FUND_ID } from "@/constants/funds";
import { requireAuth } from "@/lib/auth/session";
import { projectedReturnPct } from "@/features/investor/types/pool-participation";
import type { ReturnTier } from "@/features/investor/types/account";
import { walletProjectionService } from "@/services/wallet-projection.service";
import type {
  InvestorInvestmentSummary,
  WalletPoolParticipation,
} from "@/features/investor/types/wallet";

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function computeTermEnd(
  startDate: string | null,
  maturityDate: string | null,
  durationDays: number | null
): { termEndDate: string | null; termEnded: boolean } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (maturityDate) {
    const end = new Date(maturityDate);
    end.setHours(0, 0, 0, 0);
    return {
      termEndDate: maturityDate,
      termEnded: end.getTime() <= today.getTime(),
    };
  }

  if (startDate && durationDays != null && durationDays > 0) {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + durationDays);
    const iso = end.toISOString().slice(0, 10);
    end.setHours(0, 0, 0, 0);
    return { termEndDate: iso, termEnded: end.getTime() <= today.getTime() };
  }

  return { termEndDate: null, termEnded: false };
}

export const walletService = {
  async getWalletSummary(): Promise<InvestorInvestmentSummary> {
    const user = await requireAuth();
    const db = createAdminClient();

    const { data: portfolioRows, error } = await db
      .from("investor_portfolios")
      .select(
        "fund_id, available_balance, total_invested, current_value, unrealized_pnl, realized_pnl, investment_start_date, investment_maturity_date, last_deposit_at"
      )
      .eq("user_id", user.id);

    if (error) {
      throw new Error(error.message);
    }

    const allRows = (portfolioRows ?? []) as Array<{
      fund_id: string;
      available_balance: number | null;
      total_invested: number;
      current_value: number;
      unrealized_pnl: number;
      realized_pnl: number;
      investment_start_date: string | null;
      investment_maturity_date: string | null;
      last_deposit_at: string | null;
    }>;

    const walletRow = allRows.find((row) => row.fund_id === DEFAULT_FUND_ID);
    const legacyBalance = toNumber(walletRow?.available_balance);
    const projection = await walletProjectionService.getForInvestor(user.id);
    const balance = projection.source === "ledger" ? projection.available : legacyBalance;

    const participationRows = allRows
      .filter((row) => toNumber(row.total_invested) > 0)
      .sort((a, b) => {
        const aTime = a.last_deposit_at ? new Date(a.last_deposit_at).getTime() : 0;
        const bTime = b.last_deposit_at ? new Date(b.last_deposit_at).getTime() : 0;
        return bTime - aTime;
      });

    if (participationRows.length === 0) {
      return { balance, poolProfit: 0, participations: [] };
    }

    const fundIds = participationRows.map((r) => r.fund_id);

    const [fundsResult, statsResult] = await Promise.all([
      db
        .from("funds")
        .select("id, name, return_tiers, pool_duration_days")
        .in("id", fundIds),
      db.from("pool_stats").select("fund_id, win_rate").in("fund_id", fundIds),
    ]);

    const fundMap = new Map(
      (
        (fundsResult.data ?? []) as Array<{
          id: string;
          name: string;
          return_tiers: ReturnTier[] | null;
          pool_duration_days: number | null;
        }>
      ).map((f) => [f.id, f])
    );

    const winRateMap = new Map(
      (
        (statsResult.data ?? []) as Array<{ fund_id: string; win_rate: number }>
      ).map((s) => [s.fund_id, toNumber(s.win_rate)])
    );

    let poolProfit = 0;
    const participations: WalletPoolParticipation[] = participationRows.map((row) => {
      const fund = fundMap.get(row.fund_id);
      const invested = toNumber(row.total_invested);
      const unrealized = toNumber(row.unrealized_pnl);
      const realized = toNumber(row.realized_pnl);
      const profit = unrealized + realized;
      poolProfit += profit;

      const tiers = Array.isArray(fund?.return_tiers) ? fund.return_tiers : [];
      const { termEndDate, termEnded } = computeTermEnd(
        row.investment_start_date,
        row.investment_maturity_date,
        fund?.pool_duration_days ?? null
      );

      return {
        fundId: row.fund_id,
        poolName: fund?.name ?? "Pool",
        amountInvested: invested,
        currentValue: toNumber(row.current_value),
        poolProfit: profit,
        projectedReturnPct: projectedReturnPct(invested, tiers),
        poolWinRate: winRateMap.get(row.fund_id) ?? 0,
        investmentStartDate: row.investment_start_date,
        termEndDate,
        termEnded,
        poolDurationDays: fund?.pool_duration_days ?? null,
      };
    });

    return { balance, poolProfit, participations };
  },
};
