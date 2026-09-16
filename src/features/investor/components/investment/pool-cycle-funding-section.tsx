import { copyTradingText } from "@/lib/copy-trading-presentation";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { InvestorFundingCycleView } from "@/domain/investment/investor-presentation";
import { formatCycleProfitSplit } from "@/domain/investment/profit-split";

export function PoolCycleFundingSection({ funding }: { funding: InvestorFundingCycleView }) {
  const { cycle } = funding;


  return (
    <section className="overflow-hidden rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-[var(--id-shadow)]">
      <div className="border-b border-[var(--id-border)] px-5 py-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--id-accent)]">
          Copy Opportunity
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[var(--id-text)]">{copyTradingText(cycle.name)}</h2>
      </div>

      <div className="space-y-6 px-5 py-5 sm:px-6">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Metric label="Copiers" value={String(cycle.investorCount)} />
          <Metric
            label="Minimum copy amount"
            value={cycle.minInvestment != null ? formatCurrency(cycle.minInvestment) : "—"}
          />
          <Metric label="Trading time" value={funding.tradingScheduleLabel ?? "—"} />
          <Metric label="Traded capital" value={formatCurrency(funding.displayedTradedCapital)} />
          {funding.investorAmount != null && funding.investorAmount > 0 && (
            <Metric label="Your commitment" value={formatCurrency(funding.investorAmount)} />
          )}
          {funding.projectedMultiplier != null && (
            <Metric
              label="Copy ratio"
              value={`${funding.projectedMultiplier.toFixed(2)}×`}
              hint={
                funding.projectedReturnPct != null
                  ? `${funding.projectedReturnPct}% projected return`
                  : undefined
              }
            />
          )}
          {funding.profitSplit && (
            <Metric
              label={funding.profitSplitTierName ? `${funding.profitSplitTierName} profit split` : "Profit split"}
              value={formatCycleProfitSplit(funding.profitSplit)}
            />
          )}
        </dl>

        <div className="flex flex-wrap gap-3 pt-1">
          {cycle.isAllocatable && (
            <Button asChild className="rounded-xl [background:var(--id-accent-gradient)] text-white">
              <Link href={funding.commitHref}>Copy</Link>
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
