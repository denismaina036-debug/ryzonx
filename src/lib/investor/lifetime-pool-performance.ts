function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

export type LifetimePoolPerformance = {
  lifetimeProfit: number;
  lifetimeProfitPct: number;
  bestDayProfit: number | null;
};

/** Cumulative pool investment performance — not reduced by profit withdrawals. */
export function computeLifetimePoolPerformance(
  rows: Array<{ amount: number | string; created_at: string }>,
  investedCapital: number
): LifetimePoolPerformance {
  let lifetimeProfit = 0;
  const dailyTotals = new Map<string, number>();

  for (const row of rows) {
    const amount = toNumber(row.amount);
    lifetimeProfit += amount;
    const dayKey = row.created_at.slice(0, 10);
    dailyTotals.set(dayKey, (dailyTotals.get(dayKey) ?? 0) + amount);
  }

  let bestDayProfit: number | null = null;
  for (const total of dailyTotals.values()) {
    if (bestDayProfit == null || total > bestDayProfit) {
      bestDayProfit = total;
    }
  }

  return {
    lifetimeProfit: Math.round(lifetimeProfit * 100) / 100,
    lifetimeProfitPct:
      investedCapital > 0 ? Math.round((lifetimeProfit / investedCapital) * 10000) / 100 : 0,
    bestDayProfit: bestDayProfit != null ? Math.round(bestDayProfit * 100) / 100 : null,
  };
}
