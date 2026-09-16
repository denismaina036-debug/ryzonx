"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { TRADE_ENTRY_DIRECTION_LABELS, TRADE_ENTRY_RESULT_LABELS } from "@/constants/trade-entry";
import type { PublicTradeEntryView } from "@/domain/trading-journal/types";
import { cn, formatCurrency } from "@/lib/utils";

export function InvestorCycleTradeFeed({
  trades,
  live = false,
}: {
  trades: PublicTradeEntryView[];
  live?: boolean;
}) {
  if (trades.length === 0) return null;

  return (
    <section className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-[var(--id-text)]">Recent Strategy Trades</h2>
            {live && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                Live
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--id-text-muted)]">
            Recent verified trades recorded by the verified trader.
          </p>
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
  const pnl = trade.copierRealizedPnl !== undefined
    ? trade.copierRealizedPnl ?? 0
    : trade.realizedPnl ?? 0;
  const isWin = pnl > 0 || (pnl === 0 && trade.tradeResult === "profit");
  const isLoss = pnl < 0 || (pnl === 0 && trade.tradeResult === "loss");
  const isPersonalized = trade.copierRealizedPnl !== undefined;

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
            <p className="font-semibold text-[var(--id-text)]">
              {isPersonalized
                ? `COPIER ${isLoss ? "LOSS" : "PROFIT"} ${trade.instrument} ${TRADE_ENTRY_DIRECTION_LABELS[trade.direction].toUpperCase()}`
                : trade.instrument}
            </p>
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
                {(isPersonalized || trade.realizedPnl != null) && (
                  <span>
                    {pnl >= 0 ? "+" : "-"}
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
