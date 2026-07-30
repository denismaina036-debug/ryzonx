"use client";

import Image from "next/image";
import { TRADE_ENTRY_DIRECTION_LABELS, TRADE_ENTRY_RESULT_LABELS } from "@/constants/trade-entry";
import type { PublicTradeEntryView } from "@/domain/trading-journal/types";
import { formatCurrency } from "@/lib/utils";
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
          <li
            key={trade.id}
            className="overflow-hidden rounded-xl border border-[var(--id-border)] bg-[var(--id-bg)]"
          >
            <div className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-[var(--id-text)]">{trade.instrument}</p>
                  <p className="mt-1 text-xs text-[var(--id-text-muted)]">
                    {TRADE_ENTRY_DIRECTION_LABELS[trade.direction]} · {trade.quantity} @{" "}
                    {trade.entryPrice}
                    {trade.exitPrice != null ? ` → ${trade.exitPrice}` : ""}
                  </p>
                </div>
                {trade.tradeResult && (
                  <span
                    className={`text-sm font-medium ${
                      (trade.realizedPnl ?? 0) >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {TRADE_ENTRY_RESULT_LABELS[trade.tradeResult]}
                    {trade.realizedPnl != null &&
                      ` · ${trade.realizedPnl >= 0 ? "+" : ""}${formatCurrency(trade.realizedPnl)}`}
                  </span>
                )}
              </div>
            </div>
            {trade.screenshotUrl ? (
              <div className="border-t border-[var(--id-border)] bg-[var(--id-surface-muted)] p-3">
                <div className="relative aspect-video overflow-hidden rounded-lg">
                  <Image
                    src={trade.screenshotUrl}
                    alt={`${trade.instrument} trade chart`}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 720px"
                  />
                </div>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
