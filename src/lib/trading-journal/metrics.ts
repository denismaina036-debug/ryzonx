import type { TradeEntry } from "@/domain/trading-journal/types";
import type { OperationalMetrics } from "@/domain/trading-journal/types";

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function isWinningTrade(entry: TradeEntry): boolean {
  if (entry.exitPrice == null || entry.status !== "closed") return false;
  if (entry.direction === "long") return entry.exitPrice > entry.entryPrice;
  return entry.exitPrice < entry.entryPrice;
}

function isLosingTrade(entry: TradeEntry): boolean {
  if (entry.exitPrice == null || entry.status !== "closed") return false;
  if (entry.direction === "long") return entry.exitPrice < entry.entryPrice;
  return entry.exitPrice > entry.entryPrice;
}

export function computeOperationalMetrics(entries: TradeEntry[]): OperationalMetrics {
  const openEntries = entries.filter((e) => e.status === "open" || e.status === "partially_closed");
  const closedEntries = entries.filter((e) => e.status === "closed");
  const countedTrades = entries.filter((e) => e.status !== "draft" && e.status !== "archived");

  const holdingDurations = closedEntries
    .filter((e) => e.openedAt && e.closedAt)
    .map((e) => {
      const ms = new Date(e.closedAt!).getTime() - new Date(e.openedAt!).getTime();
      return ms / (1000 * 60 * 60);
    });

  const averageHoldingHours =
    holdingDurations.length > 0
      ? holdingDurations.reduce((s, h) => s + h, 0) / holdingDurations.length
      : null;

  const currentExposure = openEntries.reduce(
    (sum, e) => sum + toNumber(e.entryPrice) * toNumber(e.quantity),
    0
  );

  return {
    totalTrades: countedTrades.length,
    winningTrades: closedEntries.filter(isWinningTrade).length,
    losingTrades: closedEntries.filter(isLosingTrade).length,
    openPositions: openEntries.length,
    closedPositions: closedEntries.length,
    averageHoldingHours,
    currentExposure,
  };
}
