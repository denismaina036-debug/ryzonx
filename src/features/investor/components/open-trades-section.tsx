"use client";

import Link from "next/link";
import {
  DashboardCard,
  dashboardCardBodyClass,
} from "@/features/investor/components/dashboard-card";
import { InvestorTradeStatusBadge } from "@/features/investor/components/investor-trade-status-badge";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import type { InvestorDashboardTrade } from "@/features/investor/types";

interface PoolTradesSectionProps {
  trades: InvestorDashboardTrade[];
}

const ASSET_ICONS: Record<string, string> = {
  EURUSD: "€$",
  XAUUSD: "Au",
  GBPUSD: "£$",
  BTCUSD: "₿",
};

export function PoolTradesSection({ trades }: PoolTradesSectionProps) {
  const poolTrades = trades.slice(0, 5);
  const totalCount = trades.length;

  return (
    <DashboardCard
      title={`Pool Trades${totalCount > 0 ? ` (${totalCount})` : ""}`}
      headerAction={
        <Link
          href={ROUTES.trades}
          className="text-xs font-medium text-[var(--id-accent-text)] hover:underline"
        >
          View all
        </Link>
      }
    >
      {poolTrades.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-[var(--id-text-muted)]">
          No pool trades published yet. Approved trades from pool managers will appear here.
        </p>
      ) : (
        <div className={cn(dashboardCardBodyClass, "space-y-0 pt-0")}>
          {poolTrades.map((trade) => (
            <PoolTradeRow key={trade.id} trade={trade} />
          ))}
        </div>
      )}
    </DashboardCard>
  );
}

function PoolTradeRow({ trade }: { trade: InvestorDashboardTrade }) {
  const profitPositive = trade.profitLoss >= 0;
  const pct =
    trade.entryPrice > 0
      ? ((trade.currentPrice - trade.entryPrice) / trade.entryPrice) *
        100 *
        (trade.direction === "long" ? 1 : -1)
      : 0;
  const iconLabel = ASSET_ICONS[trade.asset.replace("/", "")] ?? trade.asset.slice(0, 2);

  return (
    <div className="flex items-center gap-3 border-b border-[var(--id-border)] py-3.5 last:border-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--id-surface-muted)] text-[10px] font-bold text-[var(--id-text-secondary)]">
        {iconLabel}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-[var(--id-text)]">{trade.asset}</p>
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
              trade.direction === "long"
                ? "bg-[var(--id-success-soft)] text-[var(--id-success)]"
                : "bg-red-500/10 text-[var(--id-danger)]"
            )}
          >
            {trade.direction === "long" ? "Buy" : "Sell"}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
          <span className="text-[var(--id-text-muted)]">
            Entry{" "}
            <span className="font-mono text-[var(--id-text)]">
              {formatPrice(trade.entryPrice)}
            </span>
          </span>
          <span className="text-[var(--id-text-muted)]">
            {trade.isActive ? "Current" : "Exit"}{" "}
            <span className="font-mono text-[var(--id-text)]">
              {formatPrice(trade.currentPrice)}
            </span>
          </span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p
          className={cn(
            "font-mono text-sm font-semibold tabular-nums",
            profitPositive ? "text-[var(--id-success)]" : "text-[var(--id-danger)]"
          )}
        >
          {profitPositive ? "+" : ""}
          {pct.toFixed(2)}%
        </p>
        <div className="mt-1 flex justify-end">
          <InvestorTradeStatusBadge status={trade.status} />
        </div>
      </div>
    </div>
  );
}

function formatPrice(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 5,
  });
}

/** @deprecated Use PoolTradesSection */
export const OpenTradesSection = PoolTradesSection;
export const InvestorTradesSection = PoolTradesSection;
