export type CopierProfitAllocation = {
  trade_entry_id: string;
  profit_amount: number | string;
  created_at: string;
};

export type CopierLossAllocation = {
  trade_entry_id: string;
  loss_amount: number | string;
  created_at: string;
};

function toNumber(value: number | string): number {
  return typeof value === "number" ? value : Number(value);
}

export function mergeAuthoritativeCopierTradeResults(
  profits: readonly CopierProfitAllocation[],
  losses: readonly CopierLossAllocation[]
): Map<string, number> {
  const results = new Map<string, number>();
  for (const row of profits) {
    results.set(
      row.trade_entry_id,
      (results.get(row.trade_entry_id) ?? 0) + toNumber(row.profit_amount)
    );
  }
  for (const row of losses) {
    results.set(
      row.trade_entry_id,
      (results.get(row.trade_entry_id) ?? 0) - Math.abs(toNumber(row.loss_amount))
    );
  }
  return results;
}

export function selectAuthoritativeCopierTradeRows<
  T extends { id: string; closed_at: string | null; opened_at: string | null; created_at: string },
>(trades: readonly T[], results: ReadonlyMap<string, number>, limit: number): T[] {
  const seen = new Set<string>();
  return trades
    .filter((trade) => {
      if (!results.has(trade.id) || seen.has(trade.id)) return false;
      seen.add(trade.id);
      return true;
    })
    .sort((a, b) => {
      const aTime = new Date(a.closed_at ?? a.opened_at ?? a.created_at).getTime();
      const bTime = new Date(b.closed_at ?? b.opened_at ?? b.created_at).getTime();
      return bTime - aTime;
    })
    .slice(0, limit);
}
