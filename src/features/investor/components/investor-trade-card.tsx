"use client";

import Image from "next/image";
import { cn, formatCurrency } from "@/lib/utils";
import { dashboardLabelClass } from "@/features/investor/components/dashboard-card";
import { InvestorTradeStatusBadge } from "@/features/investor/components/investor-trade-status-badge";
import { investorCardClass } from "@/features/investor/constants/ui";
import type { InvestorDashboardTrade } from "@/features/investor/types";

export function InvestorTradeCard({ trade }: { trade: InvestorDashboardTrade }) {
  const profitPositive = trade.profitLoss >= 0;

  return (
    <article
      className={cn(
        investorCardClass,
        "overflow-hidden transition-colors hover:bg-[var(--id-surface-hover)]"
      )}
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[var(--id-text)]">{trade.asset}</p>
            <DirectionPill direction={trade.direction} />
            <InvestorTradeStatusBadge status={trade.status} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
            <Stat label="Entry" value={formatPrice(trade.entryPrice)} />
            <Stat
              label={trade.isActive ? "Current" : "Exit"}
              value={formatPrice(trade.currentPrice)}
            />
            <Stat label="Invested" value={formatCurrency(trade.investedAmount)} />
          </div>
          <p className="mt-2 text-[10px] text-[var(--id-text-faint)]">
            Opened{" "}
            {new Date(trade.openedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-start sm:items-end">
          <p className={dashboardLabelClass}>P/L</p>
          <p
            className={cn(
              "mt-1 font-mono text-base font-semibold tabular-nums",
              profitPositive ? "text-[var(--id-success)]" : "text-[var(--id-danger)]"
            )}
          >
            {profitPositive ? "+" : ""}
            {formatCurrency(trade.profitLoss)}
          </p>
        </div>
      </div>

      {trade.chartScreenshotUrl ? (
        <div className="border-t border-[var(--id-border)] bg-[var(--id-surface-muted)] p-3 sm:p-4">
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--id-text-muted)]">
            TradingView
          </p>
          <div className="relative aspect-[16/7] overflow-hidden rounded-lg border border-[var(--id-border)]">
            <Image
              src={trade.chartScreenshotUrl}
              alt={`${trade.asset} chart`}
              fill
              className="object-cover object-top"
              sizes="(max-width: 768px) 100vw, 800px"
              unoptimized
            />
          </div>
        </div>
      ) : null}
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className={dashboardLabelClass}>{label}</p>
      <p className="mt-0.5 font-mono text-sm font-medium tabular-nums text-[var(--id-text)]">
        {value}
      </p>
    </div>
  );
}

function DirectionPill({ direction }: { direction: "long" | "short" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
        direction === "long"
          ? "bg-[var(--id-success-soft)] text-[var(--id-success)]"
          : "bg-red-500/10 text-[var(--id-danger)]"
      )}
    >
      {direction === "long" ? "Buy" : "Sell"}
    </span>
  );
}

function formatPrice(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 5,
  });
}
