"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { TRADE_ENTRY_DIRECTION_LABELS, TRADE_ENTRY_RESULT_LABELS } from "@/constants/trade-entry";
import type { PublicTradeEntryView } from "@/domain/trading-journal/types";
import { cn, formatCurrency } from "@/lib/utils";
import { SimpleCyclePhaseBar } from "@/features/pool-manager/components/journal/simple-cycle-phase-bar";

export function InvestorCycleTradeFeed({
  trades,
  cycleStatus,
}: {
  trades: PublicTradeEntryView[];
  cycleStatus: string;
}) {
  if (trades.length === 0) return null;

  return (
    <section className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-[var(--id-text)]">Trading Journal</h2>
          <p className="mt-1 text-sm text-[var(--id-text-muted)]">
            Verified trades recorded by the pool manager with chart screenshots.
          </p>
        </div>
        <div className="w-full sm:max-w-xs">
          <SimpleCyclePhaseBar cycleStatus={cycleStatus} />
        </div>
      </div>

      <ul className="mt-6 space-y-4">
        {trades.map((trade) => (
          <InvestorTradeCard key={trade.id} trade={trade} />
        ))}
      </ul>
    </section>
  );
}

function InvestorTradeCard({ trade }: { trade: PublicTradeEntryView }) {
  const isWin = trade.tradeResult === "profit" || (trade.realizedPnl ?? 0) > 0;
  const isLoss = trade.tradeResult === "loss" || (trade.realizedPnl ?? 0) < 0;
  const pnl = trade.realizedPnl ?? 0;

  return (
    <li
      className={cn(
        "overflow-hidden rounded-xl border-2",
        isWin
          ? "border-emerald-500/50 bg-emerald-500/5 dark:border-emerald-400/40 dark:bg-emerald-500/10"
          : isLoss
            ? "border-rose-500/50 bg-rose-500/5 dark:border-rose-400/40 dark:bg-rose-500/10"
            : "border-[var(--id-border)] bg-[var(--id-bg)]"
      )}
    >
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-[var(--id-text)]">{trade.instrument}</p>
            <p className="mt-1 text-xs text-[var(--id-text-muted)]">
              {TRADE_ENTRY_DIRECTION_LABELS[trade.direction]}
            </p>
            {trade.tradeResult && (
              <p
                className={cn(
                  "mt-2 inline-flex items-center gap-1.5 text-sm font-semibold",
                  isWin
                    ? "text-emerald-700 dark:text-emerald-400"
                    : isLoss
                      ? "text-rose-700 dark:text-rose-400"
                      : "text-[var(--id-text-muted)]"
                )}
              >
                {isWin ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {TRADE_ENTRY_RESULT_LABELS[trade.tradeResult]}
                {trade.realizedPnl != null && (
                  <span>
                    {pnl >= 0 ? "+" : ""}
                    {formatCurrency(Math.abs(pnl))}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
      {trade.screenshotUrl ? (
        <div className="border-t border-[var(--id-border)] bg-[var(--id-surface-muted)] p-3">
          <div className="relative aspect-video overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={trade.screenshotUrl}
              alt={`${trade.instrument} trade chart`}
              className="h-full w-full object-contain"
            />
          </div>
        </div>
      ) : null}
    </li>
  );
}
