"use client";

import { ImageIcon } from "lucide-react";
import { TRADE_ENTRY_RESULT_LABELS } from "@/constants/trade-entry";
import type { PublicPoolTradeView } from "@/domain/trading-journal/types";
import {
  formatTradeDirectionLabel,
  hasScreenshot,
  screenshotListLabel,
} from "@/lib/trading/trade-display";
import { cn, formatCurrency } from "@/lib/utils";

interface PoolActivityTradeCardProps {
  trade: PublicPoolTradeView;
  onSelect: (trade: PublicPoolTradeView) => void;
}

export function PoolActivityTradeCard({ trade, onSelect }: PoolActivityTradeCardProps) {
  const pnl = trade.realizedPnl ?? 0;
  const isWin = trade.tradeResult === "profit" || pnl > 0;
  const isLoss = trade.tradeResult === "loss" || pnl < 0;
  const closedDate = trade.closedAt ? new Date(trade.closedAt) : null;
  const screenshotLabel = hasScreenshot(trade.screenshotUrl)
    ? screenshotListLabel(trade.screenshotUrl)
    : "—";

  return (
    <button
      type="button"
      onClick={() => onSelect(trade)}
      className={cn(
        "w-full rounded-xl border border-[var(--id-border)] bg-[var(--id-surface)] p-4 text-left transition-colors",
        "hover:border-[var(--id-accent)]/40 hover:bg-[var(--id-surface-muted)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--id-accent)]"
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-base font-semibold text-[var(--id-text)]">
              {trade.instrument}
            </p>
            <span className="rounded-md bg-[var(--id-bg)] px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">
              {formatTradeDirectionLabel(trade.direction)}
            </span>
          </div>
          <p
            className={cn(
              "text-sm font-semibold tabular-nums",
              isWin
                ? "text-emerald-600 dark:text-emerald-400"
                : isLoss
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-[var(--id-text-muted)]"
            )}
          >
            {trade.tradeResult ? TRADE_ENTRY_RESULT_LABELS[trade.tradeResult] : "Closed"}
            {trade.realizedPnl != null && (
              <span className="ml-2">
                {pnl >= 0 ? "+" : "−"}
                {formatCurrency(Math.abs(pnl))}
              </span>
            )}
          </p>
        </div>

        <div className="grid w-full gap-2 text-sm sm:w-auto sm:min-w-[220px] sm:text-right">
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className="text-[var(--id-text-faint)] sm:hidden">Amount</span>
            <span className="font-medium tabular-nums text-[var(--id-text)]">
              {trade.realizedPnl != null ? formatCurrency(Math.abs(pnl)) : "—"}
            </span>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-3 sm:justify-end">
            <span className="shrink-0 text-[var(--id-text-faint)] sm:hidden">Screenshot</span>
            <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-[var(--id-text-muted)]">
              {hasScreenshot(trade.screenshotUrl) ? (
                <ImageIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              ) : null}
              <span className="truncate">{screenshotLabel}</span>
            </span>
          </div>
          {closedDate && (
            <p className="text-xs tabular-nums text-[var(--id-text-muted)]">
              {closedDate.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}{" "}
              ·{" "}
              {closedDate.toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
