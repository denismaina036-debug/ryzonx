import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { InvestorFundingCycleView } from "@/domain/investment/investor-presentation";

export function PoolCycleFundingSection({ funding }: { funding: InvestorFundingCycleView }) {
  const { cycle } = funding;
  const target = cycle.targetCapital;
  const progressPct =
    cycle.fundingPct ??
    (target && target > 0
      ? Math.min(100, Math.round((cycle.raisedCapital / target) * 1000) / 10)
      : null);

  return (
    <section className="overflow-hidden rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-[var(--id-shadow)]">
      <div className="border-b border-[var(--id-border)] px-5 py-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--id-accent)]">
          Funding Cycle
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[var(--id-text)]">{cycle.name}</h2>
      </div>

      <div className="space-y-6 px-5 py-5 sm:px-6">
        {progressPct != null && (
          <div>
            <div className="flex justify-between text-xs text-[var(--id-text-muted)]">
              <span>Raised capital</span>
              <span>{progressPct}%</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--id-border)]">
              <div
                className="h-full rounded-full [background:var(--id-accent-gradient)]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-[var(--id-text-muted)]">
              {formatCurrency(cycle.raisedCapital)}
              {target != null && ` of ${formatCurrency(target)} target`}
            </p>
          </div>
        )}

        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Metric label="Investors" value={String(cycle.investorCount)} />
          <Metric
            label="Minimum investment"
            value={cycle.minInvestment != null ? formatCurrency(cycle.minInvestment) : "—"}
          />
          <Metric label="Trading time" value={funding.tradingScheduleLabel ?? "—"} />
          <Metric label="Payout duration" value={funding.payoutDurationLabel || "—"} />
          {funding.investorAmount != null && funding.investorAmount > 0 && (
            <Metric label="Your commitment" value={formatCurrency(funding.investorAmount)} />
          )}
          {funding.projectedMultiplier != null && (
            <Metric
              label="Projected multiplier"
              value={`${funding.projectedMultiplier.toFixed(2)}×`}
              hint={
                funding.projectedReturnPct != null
                  ? `${funding.projectedReturnPct}% projected return`
                  : undefined
              }
            />
          )}
        </dl>

        <div className="flex flex-wrap gap-3 pt-1">
          {cycle.isAllocatable && (
            <Button asChild className="rounded-xl [background:var(--id-accent-gradient)] text-white">
              <Link href={funding.commitHref}>Invest</Link>
            </Button>
          )}
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={`${ROUTES.marketplaceCycles}/${cycle.slug}`}>View opportunity</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--id-border)] bg-[var(--id-bg)] px-4 py-3">
      <dt className="text-xs text-[var(--id-text-muted)]">{label}</dt>
      <dd className="mt-1 text-sm font-semibold tabular-nums text-[var(--id-text)]">{value}</dd>
      {hint && <p className="mt-0.5 text-xs text-[var(--id-text-muted)]">{hint}</p>}
    </div>
  );
}
