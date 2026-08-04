import type { InvestorInvestmentSummary } from "@/features/investor/types/wallet";

/** Aggregate investor-facing portfolio figures for dashboard cards. */
export function computeInvestorPortfolioTotals(investment: InvestorInvestmentSummary) {
  const availableBalance = investment.balance;
  const investedCapital = investment.participations.reduce(
    (sum, participation) => sum + participation.amountInvested,
    0
  );
  const poolCurrentValue = investment.participations.reduce(
    (sum, participation) => sum + participation.currentValue,
    0
  );
  const poolProfit = investment.poolProfit;
  const portfolioValue = availableBalance + poolCurrentValue;

  return {
    availableBalance,
    investedCapital,
    poolCurrentValue,
    poolProfit,
    portfolioValue,
  };
}

/** Daily return % against start-of-day portfolio value (excludes today's profit from denominator). */
export function computeDailyProfitPct(portfolioValue: number, dailyProfit: number): number {
  const startOfDayValue = Math.max(0, portfolioValue - dailyProfit);
  if (startOfDayValue <= 0) return 0;
  return (dailyProfit / startOfDayValue) * 100;
}
