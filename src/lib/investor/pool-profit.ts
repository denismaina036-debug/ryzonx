import { roundMoney } from "@/lib/investment-engine/ownership";

export type PoolProfitInputs = {
  invested: number;
  currentValue: number;
  realizedPnl: number;
  unrealizedPnl: number;
  profitWalletBalance: number;
};

/** Match investor wallet summary profit display for a pool participation row. */
export function resolveAvailablePoolProfit(input: PoolProfitInputs): number {
  const invested = roundMoney(input.invested);
  const walletProfit = roundMoney(input.profitWalletBalance);
  const legacyProfit = roundMoney(input.realizedPnl + input.unrealizedPnl);
  const storedValue = roundMoney(input.currentValue);

  let profit = walletProfit > 0 ? walletProfit : legacyProfit;
  const computedValue = roundMoney(invested + profit);
  if (storedValue > computedValue) {
    profit = roundMoney(Math.max(profit, storedValue - invested));
  }

  return Math.max(0, profit);
}

export function normalizeProfitTransferAmount(
  requestedAmount: number | undefined,
  availableProfit: number
): number {
  const available = roundMoney(availableProfit);
  if (available <= 0) return 0;

  const amount =
    requestedAmount != null && Number.isFinite(requestedAmount)
      ? roundMoney(requestedAmount)
      : available;

  if (amount > available + 0.004) {
    throw new Error("Amount exceeds available pool profit.");
  }

  if (Math.abs(amount - available) <= 0.004) {
    return available;
  }

  return amount;
}
