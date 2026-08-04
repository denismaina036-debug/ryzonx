"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import type { InvestorClosedCycleView } from "@/domain/investment/investor-presentation";
import { InvestorCycleTradeFeed } from "./investor-cycle-trade-feed";

export function PoolCycleClosedSection({ cycles }: { cycles: InvestorClosedCycleView[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (cycles.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-[var(--id-shadow)]">
      <div className="border-b border-[var(--id-border)] px-5 py-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--id-text-muted)]">
          Closed Cycles
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[var(--id-text)]">Completed cycles</h2>
      </div>

      <ul className="divide-y divide-[var(--id-border)]">
        {cycles.map((cycle) => {
          const isOpen = expandedId === cycle.id;
          return (
            <li key={cycle.id}>
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : cycle.id)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--id-surface-hover)] sm:px-6"
              >
                <div className="min-w-0">
                  <p className="font-medium text-[var(--id-text)]">{cycle.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--id-text-muted)]">
                    Cycle {cycle.cycleNumber}
                    {cycle.completedAt &&
                      ` · ${new Date(cycle.completedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={cn(
                      "font-mono text-sm font-semibold tabular-nums",
                      cycle.profitRealized >= 0
                        ? "text-[var(--id-success)]"
                        : "text-[var(--id-danger)]"
                    )}
                  >
                    {cycle.profitRealized >= 0 ? "+" : ""}
                    {formatCurrency(cycle.profitRealized)}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-[var(--id-text-muted)] transition-transform",
                      isOpen && "rotate-180"
                    )}
                  />
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-[var(--id-border)] bg-[var(--id-bg)] px-5 py-5 sm:px-6">
                  <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Metric label="Capital traded" value={formatCurrency(cycle.capitalTraded)} />
                    <Metric label="Profit realized" value={formatCurrency(cycle.profitRealized)} />
                    <Metric label="Trades taken" value={String(cycle.tradeCount)} />
                    <Metric label="Investors" value={String(cycle.investorCount)} />
                    <Metric label="Your investment" value={formatCurrency(cycle.investorAmount)} />
                  </dl>

                  {cycle.trades.length > 0 && (
                    <div className="mt-6">
                      <InvestorCycleTradeFeed trades={cycle.trades} cycleStatus="completed" />
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--id-border)] bg-[var(--id-surface)] px-4 py-3">
      <dt className="text-xs text-[var(--id-text-muted)]">{label}</dt>
      <dd className="mt-1 text-sm font-semibold tabular-nums text-[var(--id-text)]">{value}</dd>
    </div>
  );
}
