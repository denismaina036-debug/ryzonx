"use client";

import { SimpleCyclePhaseBar } from "@/features/pool-manager/components/journal/simple-cycle-phase-bar";
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
  const profitTone =
    liveTrading && liveTrading.currentCycleProfit > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : liveTrading && liveTrading.currentCycleProfit < 0
        ? "text-red-600 dark:text-red-400"
        : undefined;
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
            {isTrading ? "Live Trading Activity" : "Cycle Progress"}
          </h2>
          {isTrading && <LiveTradingBadge active={live} />}
        </div>
        <div className="mt-4">
          <SimpleCyclePhaseBar cycleStatus={portfolioProgress.cycleStatus} />
        </div>

        {isTrading && liveTrading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Stat label="Current copy profit" value={formatCurrency(liveTrading.currentCycleProfit)} valueClassName={profitTone} />
            <Stat label="Trades recorded" value={String(liveTrading.tradesRecorded)} />
            <Stat
              label="Your allocation"
              value={
                liveTrading.investorInvestment != null
                  ? formatCurrency(liveTrading.investorInvestment)
                  : "—"
              }
            />
            <Stat
              label="Your ownership"
              value={
                liveTrading.investorOwnershipPct != null
                  ? `${liveTrading.investorOwnershipPct.toFixed(2)}%`
                  : "—"
              }
            />
            <Stat
              label="Your projected profit"
              value={
                liveTrading.investorProjectedProfit != null
                  ? formatCurrency(liveTrading.investorProjectedProfit)
                  : "—"
              }
              valueClassName={projectedTone}
            />
            <Stat label="Status" value={operations.simplifiedPhaseLabel} />
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Status" value={operations.simplifiedPhaseLabel} />
            <Stat label="Recorded trades" value={String(journalSummary.totalTrades)} />
            <Stat label="Closed trades" value={String(journalSummary.closedPositionsCount)} />
            <Stat
              label="Traded capital"
              value={formatCurrency(operations.simplifiedPhase === "funding" ? 0 : portfolioProgress.raisedCapital)}
            />
          </div>
        )}

        {portfolioProgress.fundingStartedAt && operations.simplifiedPhase === "funding" && (
          <p className="mt-4 text-sm text-[var(--id-text-muted)]">
            Funding opened{" "}
            <span className="font-medium text-[var(--id-text)]">
              {new Date(portfolioProgress.fundingStartedAt).toLocaleString()}
            </span>
          </p>
        )}

        {isTrading && liveTrading && (
          <p className="mt-4 text-xs text-[var(--id-text-muted)]">
            Projected profit is an estimate only. Portfolio value and wallets update only after
            profit distribution.
          </p>
        )}
      </section>

      <InvestorCycleTradeFeed
        trades={publicTrades}
        cycleStatus={portfolioProgress.cycleStatus}
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
