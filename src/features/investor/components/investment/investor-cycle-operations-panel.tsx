"use client";

import type { InvestorCycleOperationsView } from "@/domain/trading-journal/types";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { InvestorCycleTradeFeed } from "./investor-cycle-trade-feed";
import { LiveTradingBadge } from "./live-trading-badge";

export function InvestorCycleOperationsPanel({
  operations,
  live = false,
}: {
  operations: InvestorCycleOperationsView;
  live?: boolean;
}) {
  const { journalSummary, portfolioProgress, publicTrades, liveTrading } = operations;
  const isTrading = operations.simplifiedPhase === "trading";
  const projectedTone =
    liveTrading && (liveTrading.investorProjectedProfit ?? 0) > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : liveTrading && (liveTrading.investorProjectedProfit ?? 0) < 0
        ? "text-red-600 dark:text-red-400"
        : undefined;

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-[var(--id-text)]">
            Copy Activity
          </h2>
          {isTrading && <LiveTradingBadge active={live} />}
        </div>
        {isTrading && liveTrading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Stat label="Trades recorded" value={String(liveTrading.tradesRecorded)} />
            <Stat
              label="Copying balance"
              value={
                liveTrading.investorInvestment != null
                  ? formatCurrency(
                      liveTrading.investorInvestment +
                        (liveTrading.investorProjectedProfit ?? 0)
                    )
                  : "—"
              }
            />
            <Stat
              label="Your copied result"
              value={
                liveTrading.investorProjectedProfit != null
                  ? formatCurrency(liveTrading.investorProjectedProfit)
                  : "—"
              }
              valueClassName={projectedTone}
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Recorded trades" value={String(journalSummary.totalTrades)} />
            <Stat label="Closed trades" value={String(journalSummary.closedPositionsCount)} />
            <Stat
              label="Traded capital"
              value={formatCurrency(operations.simplifiedPhase === "funding" ? 0 : portfolioProgress.raisedCapital)}
            />
          </div>
        )}

        {isTrading && liveTrading && (
          <p className="mt-4 text-xs text-[var(--id-text-muted)]">
            Your copied result updates from the trader&apos;s recorded trades. Funding Wallet movement
            happens only when copying is stopped after the current copy period.
          </p>
        )}
      </section>

      <InvestorCycleTradeFeed
        trades={publicTrades}
        live={live && isTrading}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--id-border)] bg-[var(--id-bg)] p-3">
      <p className="text-xs text-[var(--id-text-muted)]">{label}</p>
      <p className={cn("mt-1 text-sm font-semibold text-[var(--id-text)]", valueClassName)}>
        {value}
      </p>
    </div>
  );
}
