"use client";

import { SimpleCyclePhaseBar } from "@/features/pool-manager/components/journal/simple-cycle-phase-bar";
import type { InvestorCycleOperationsView } from "@/domain/trading-journal/types";
import { formatCurrency } from "@/lib/utils";
import { InvestorCycleTradeFeed } from "./investor-cycle-trade-feed";

export function InvestorCycleOperationsPanel({
  operations,
}: {
  operations: InvestorCycleOperationsView;
}) {
  const { journalSummary, portfolioProgress, publicTrades } = operations;
  const target = portfolioProgress.targetCapital;
  const progressPct =
    portfolioProgress.fundingProgressPct ??
    (target && target > 0
      ? Math.min(100, Math.round((portfolioProgress.raisedCapital / target) * 100))
      : null);

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5">
        <h2 className="font-semibold text-[var(--id-text)]">Cycle Progress</h2>
        <div className="mt-4">
          <SimpleCyclePhaseBar cycleStatus={portfolioProgress.cycleStatus} />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Status" value={operations.simplifiedPhaseLabel} />
          <Stat label="Recorded trades" value={String(journalSummary.totalTrades)} />
          <Stat label="Closed trades" value={String(journalSummary.closedPositionsCount)} />
          <Stat
            label="Committed capital"
            value={formatCurrency(portfolioProgress.raisedCapital)}
          />
        </div>

        {portfolioProgress.fundingStartedAt && operations.simplifiedPhase === "funding" && (
          <p className="mt-4 text-sm text-[var(--id-text-muted)]">
            Funding opened{" "}
            <span className="font-medium text-[var(--id-text)]">
              {new Date(portfolioProgress.fundingStartedAt).toLocaleString()}
            </span>
          </p>
        )}

        {progressPct != null && operations.simplifiedPhase === "funding" && (
          <div className="mt-6">
            <div className="flex justify-between text-xs text-[var(--id-text-muted)]">
              <span>Funding progress</span>
              <span>{progressPct}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--id-border)]">
              <div
                className="h-full rounded-full [background:var(--id-accent-gradient)]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[var(--id-text-muted)]">
              {formatCurrency(portfolioProgress.raisedCapital)} committed
              {target != null && ` of ${formatCurrency(target)} target`} ·{" "}
              {portfolioProgress.investorCount} investors
            </p>
          </div>
        )}
      </section>

      <InvestorCycleTradeFeed
        trades={publicTrades}
        cycleStatus={portfolioProgress.cycleStatus}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--id-border)] bg-[var(--id-bg)] p-3">
      <p className="text-xs text-[var(--id-text-muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--id-text)]">{value}</p>
    </div>
  );
}
