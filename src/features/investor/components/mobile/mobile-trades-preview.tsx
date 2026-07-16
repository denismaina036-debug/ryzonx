"use client";

import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import { InvestorTradeStatusBadge } from "@/features/investor/components/investor-trade-status-badge";
import type { InvestorDashboardTrade } from "@/features/investor/types";

interface MobileTradesPreviewProps {
  trades: InvestorDashboardTrade[];
}

function TradeSparkline({ positive }: { positive: boolean }) {
  const points = positive ? [14, 12, 15, 11, 16, 13, 8, 6] : [6, 9, 7, 11, 8, 12, 13, 16];
  const width = 56;
  const height = 22;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const line = points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = ((value - min) / range) * (height - 4) + 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-6 w-14 shrink-0" aria-hidden>
      <polyline
        points={line}
        fill="none"
        stroke={positive ? "var(--id-success)" : "var(--id-danger)"}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatPrice(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 5,
  });
}

export function MobileTradesPreview({ trades }: MobileTradesPreviewProps) {
  const preview = trades.slice(0, 3);

  return (
    <section className="rounded-2xl bg-[var(--id-surface)] p-4 shadow-[var(--id-shadow)]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--id-text)]">Open Trades</h2>
        <Link
          href={ROUTES.trades}
          className="text-xs font-medium text-[var(--id-accent-text)] hover:underline"
        >
          View all
        </Link>
      </div>

      {preview.length === 0 ? (
        <p className="py-6 text-center text-xs text-[var(--id-text-muted)]">
          No open trades yet.
        </p>
      ) : (
        <ul className="mt-2">
          {preview.map((trade) => {
            const positive = trade.profitLoss >= 0;
            const pct =
              trade.entryPrice > 0
                ? ((trade.currentPrice - trade.entryPrice) / trade.entryPrice) *
                  100 *
                  (trade.direction === "long" ? 1 : -1)
                : 0;

            return (
              <li
                key={trade.id}
                className="flex items-center gap-3 border-b border-[var(--id-border)] py-3 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--id-text)]">
                      {trade.asset}
                    </span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                        trade.direction === "long"
                          ? "bg-[var(--id-success-soft)] text-[var(--id-success)]"
                          : "bg-red-500/10 text-[var(--id-danger)]"
                      )}
                    >
                      {trade.direction === "long" ? "Buy" : "Sell"}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-[var(--id-text-muted)]">
                    {formatPrice(trade.currentPrice)}
                  </p>
                </div>

                <TradeSparkline positive={positive} />

                <div className="shrink-0 text-right">
                  <p
                    className={cn(
                      "font-mono text-sm font-semibold tabular-nums",
                      positive ? "text-[var(--id-success)]" : "text-[var(--id-danger)]"
                    )}
                  >
                    {positive ? "+" : ""}
                    {pct.toFixed(2)}%
                  </p>
                  <div className="mt-0.5 flex justify-end">
                    <InvestorTradeStatusBadge status={trade.status} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
