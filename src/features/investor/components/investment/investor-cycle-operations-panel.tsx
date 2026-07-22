import { CycleProgressTimeline } from "@/features/operations/components/cycle-progress-timeline";
import type { InvestorCycleOperationsView } from "@/domain/trading-journal/types";
import { formatCurrency } from "@/lib/utils";

export function InvestorCycleOperationsPanel({
  operations,
}: {
  operations: InvestorCycleOperationsView;
}) {
  const { journalSummary, portfolioProgress } = operations;
  const target = portfolioProgress.targetCapital;
  const progressPct =
    portfolioProgress.fundingProgressPct ??
    (target && target > 0
      ? Math.min(100, Math.round((portfolioProgress.raisedCapital / target) * 100))
      : null);

  return (
    <section className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5">
      <h2 className="font-semibold text-[var(--id-text)]">Investment Progress</h2>
      <p className="mt-1 text-sm text-[var(--id-text-muted)]">
        Operational transparency — summary counts only. Trade details remain with the pool manager
        and administrators.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Trading status" value={operations.tradingStatus} />
        <Stat label="Current phase" value={operations.phaseLabel} />
        <Stat label="Open positions" value={String(journalSummary.openPositionsCount)} />
        <Stat label="Closed positions" value={String(journalSummary.closedPositionsCount)} />
      </div>

      {portfolioProgress.fundingStartedAt && (
        <p className="mt-4 text-sm text-[var(--id-text-muted)]">
          Funding Start:{" "}
          <span className="font-medium text-[var(--id-text)]">
            {new Date(portfolioProgress.fundingStartedAt).toLocaleString()}
          </span>
        </p>
      )}

      {progressPct != null && (
        <div className="mt-6">
          <div className="flex justify-between text-xs text-[var(--id-text-muted)]">
            <span>Portfolio progress (funding)</span>
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

      <div className="mt-6">
        <h3 className="text-sm font-medium text-[var(--id-text)]">Trading Timeline</h3>
        <div className="mt-4 text-[var(--id-text-muted)]">
          <CycleProgressTimeline
            currentPhase={operations.currentPhase}
            events={operations.timeline}
          />
        </div>
      </div>

      <p className="mt-4 text-xs text-[var(--id-text-muted)]">
        {journalSummary.totalTrades} operational trades recorded
        {journalSummary.lastSnapshotAt &&
          ` · Last snapshot ${new Date(journalSummary.lastSnapshotAt).toLocaleDateString()}`}
      </p>
    </section>
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
