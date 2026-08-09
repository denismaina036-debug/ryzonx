import { ScoreBadge, TrendIndicator } from "@/features/performance-intelligence/components/rating-display";
import type { CycleIntelligence } from "@/domain/performance-intelligence/types";
import { formatPercentage } from "@/lib/utils";

export function InvestorCycleIntelligencePanel({ intelligence }: { intelligence: CycleIntelligence }) {
  return (
    <section className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5">
      <h2 className="font-semibold text-[var(--id-text)]">Cycle Health & Intelligence</h2>
      <p className="mt-1 text-sm text-[var(--id-text-muted)]">
        Operational health from journal activity and cycle progress — not financial returns.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cell label="Cycle Health" value={<ScoreBadge score={intelligence.operationalHealth} size="sm" />} />
        <Cell label="Progress" value={`${intelligence.completionPercentage}%`} />
        <Cell label="Trading Activity" value={String(intelligence.tradingActivity)} />
        <Cell label="Investors" value={String(intelligence.investorParticipation)} />
      </div>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <dt className="text-[var(--id-text-muted)]">Current phase</dt>
          <dd className="font-medium text-[var(--id-text)]">{intelligence.currentProgressPhase}</dd>
        </div>
        <div>
          <dt className="text-[var(--id-text-muted)]">Journal activity</dt>
          <dd className="font-medium text-[var(--id-text)]">{intelligence.journalActivity} events</dd>
        </div>
        {intelligence.fundingVelocity != null && (
          <div>
            <dt className="text-[var(--id-text-muted)]">Funding velocity</dt>
            <dd className="font-medium text-[var(--id-text)]">{intelligence.fundingVelocity.toFixed(1)} days</dd>
          </div>
        )}
        {intelligence.rating && (
          <div>
            <dt className="text-[var(--id-text-muted)]">Performance trend</dt>
            <dd className="font-medium">
              <TrendIndicator trend={intelligence.rating.trend} />
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}

export function InvestorStrategyIntelligencePanel({
  intelligence,
  managerRating,
  managerWinRatePct,
}: {
  intelligence: import("@/domain/performance-intelligence/types").StrategyIntelligence;
  managerRating?: number | null;
  managerWinRatePct?: number | null;
}) {
  const displayRating = managerRating ?? intelligence.rating?.overallRating ?? null;

  return (
    <section className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5">
      <h2 className="font-semibold text-[var(--id-text)]">Strategy Intelligence</h2>
      <p className="mt-1 text-sm text-[var(--id-text-muted)]">
        Key metrics from the pool manager&apos;s verified track record.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Cell
          label="Manager Rating"
          value={displayRating != null ? `${displayRating.toFixed(1)} ★` : "—"}
        />
        <Cell
          label="Winning Rate"
          value={managerWinRatePct != null ? formatPercentage(managerWinRatePct) : "—"}
        />
        <Cell label="Risk Class" value={intelligence.riskClassification} />
      </div>
    </section>
  );
}

function Cell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--id-border)] bg-[var(--id-bg)] p-3">
      <p className="text-xs text-[var(--id-text-muted)]">{label}</p>
      <div className="mt-1 text-sm font-semibold text-[var(--id-text)]">{value}</div>
    </div>
  );
}
