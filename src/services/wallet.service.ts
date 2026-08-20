import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_FUND_ID } from "@/constants/funds";
import { requireAuth } from "@/lib/auth/session";
import type { ManagedPoolConfig } from "@/domain/pools/managed-pool";
import { formatExpectedDurationLabel } from "@/features/marketplace/utils/marketplace-pool-card-presentation";
import {
  multiplierToDisplayPct,
  resolveRoiMultiplier,
} from "@/features/investor/types/pool-participation";
import { walletProjectionService } from "@/services/wallet-projection.service";
import { investorProfitWalletService } from "@/services/investment-engine/investor-profit-wallet.service";
import { platformInvestmentLevelService } from "@/services/platform-investment-level.service";
import { poolRoiService } from "@/services/pool-roi.service";
import type {
  InvestorInvestmentSummary,
  WalletPoolParticipation,
} from "@/features/investor/types/wallet";
import { roundMoney } from "@/lib/investment-engine/ownership";
import { resolveAvailablePoolProfit } from "@/lib/investor/pool-profit";

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function readManagedConfig(poolFaq: unknown): ManagedPoolConfig {
  if (!poolFaq || typeof poolFaq !== "object" || Array.isArray(poolFaq)) return {};
  const faq = poolFaq as { managedPool?: ManagedPoolConfig };
  return faq.managedPool ?? {};
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

    const projection = await walletProjectionService.getForInvestor(user.id);
    const balance = projection.available;

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

    const [fundsResult, statsResult, investmentLevels, multipliersByFund, profitWallets] =
      await Promise.all([
      db
        .from("funds")
        .select("id, name, pool_duration_days, pool_faq, return_duration_preset, return_duration_value, return_duration_unit")
        .in("id", fundIds),
      db.from("pool_stats").select("fund_id, win_rate").in("fund_id", fundIds),
      platformInvestmentLevelService.listActive(),
      poolRoiService.getMultipliersForFunds(fundIds),
      investorProfitWalletService.listForInvestor(user.id),
    ]);

    const fundMap = new Map(
      (
        (fundsResult.data ?? []) as Array<{
          id: string;
          name: string;
          pool_duration_days: number | null;
          pool_faq: unknown;
        }>
      ).map((f) => [f.id, f])
    );

    const winRateMap = new Map(
      (
        (statsResult.data ?? []) as Array<{ fund_id: string; win_rate: number }>
      ).map((s) => [s.fund_id, toNumber(s.win_rate)])
    );

    const profitWalletTotals = new Map<string, number>();
    for (const wallet of profitWallets) {
      profitWalletTotals.set(
        wallet.fundId,
        roundMoney((profitWalletTotals.get(wallet.fundId) ?? 0) + wallet.balance)
      );
    }

    let poolProfit = 0;
    const participations: WalletPoolParticipation[] = participationRows.map((row) => {
      const fund = fundMap.get(row.fund_id);
      const invested = toNumber(row.total_invested);
      const walletProfit = profitWalletTotals.get(row.fund_id) ?? 0;
      const profit = resolveAvailablePoolProfit({
        invested,
        currentValue: toNumber(row.current_value),
        realizedPnl: toNumber(row.realized_pnl),
        unrealizedPnl: toNumber(row.unrealized_pnl),
        profitWalletBalance: walletProfit,
      });
      const currentValue = roundMoney(invested + profit);
      poolProfit += profit;

      const managed = readManagedConfig(fund?.pool_faq);
      const poolMultipliers = multipliersByFund.get(row.fund_id) ?? [];
      const roiMultiplier = resolveRoiMultiplier(invested, investmentLevels, poolMultipliers);
      const payoutDurationLabel = formatExpectedDurationLabel(
        fund?.pool_duration_days ?? null,
        managed.durationUnit,
        managed.payoutDurationPreset
      );
      const { termEndDate, termEnded } = computeTermEnd(
        row.investment_start_date,
        row.investment_maturity_date,
        fund?.pool_duration_days ?? null
      );

      return {
        fundId: row.fund_id,
        poolName: fund?.name ?? "Pool",
        amountInvested: invested,
        currentValue,
        poolProfit: profit,
        projectedReturnPct: multiplierToDisplayPct(roiMultiplier),
        projectedRoiMultiplier: roiMultiplier,
        poolWinRate: winRateMap.get(row.fund_id) ?? 0,
        investmentStartDate: row.investment_start_date,
        termEndDate,
        termEnded,
        poolDurationDays: fund?.pool_duration_days ?? null,
        payoutDurationLabel,
      };
    });

    return { balance, poolProfit, participations };
  },
};
