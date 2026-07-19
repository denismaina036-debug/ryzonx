"use client";

import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { INVESTMENT_CYCLE_STATUS_LABELS } from "@/constants/investment-cycle";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { InvestmentCycle, Strategy } from "@/domain/investment/types";
import type { InvestorCycleCard } from "@/domain/investment/investor-presentation";
import { MarketplaceCycleCard } from "@/features/marketplace/components/investment-marketplace-cards";
import { InvestorCycleOperationsPanel } from "@/features/investor/components/investment/investor-cycle-operations-panel";
import { InvestorCycleIntelligencePanel } from "@/features/investor/components/investment/investor-intelligence-panels";
import type { InvestorCycleOperationsView } from "@/domain/trading-journal/types";
import type { CycleIntelligence } from "@/domain/performance-intelligence/types";
import { PmCycleLifecycleTimeline } from "@/features/pool-manager/components/workspace/pm-lifecycle-timeline";
import { PmFundingProgress } from "@/features/pool-manager/components/workspace/pm-funding-progress";
import {
  MarketplaceBreadcrumb,
  marketplaceHomeCrumb,
} from "@/features/marketplace/components/marketplace-breadcrumb";

export function CycleOpportunityView({
  cycle,
  strategy,
  manager,
  relatedCycles,
  operations,
  intelligence,
}: {
  cycle: InvestmentCycle;
  strategy: Strategy;
  manager: { id: string; name: string; slug: string | null; rating: number | null };
  relatedCycles: InvestorCycleCard[];
  operations?: InvestorCycleOperationsView | null;
  intelligence?: CycleIntelligence | null;
}) {
  const remaining =
    cycle.maxCapacity != null ? Math.max(0, cycle.maxCapacity - cycle.raisedCapital) : null;
  const canAllocate = cycle.status === "funding";

  return (
    <div className="space-y-8 pb-10">
      <MarketplaceBreadcrumb
        items={[
          marketplaceHomeCrumb(),
          { label: strategy.name, href: `${ROUTES.marketplaceStrategies}/${strategy.slug}` },
          { label: cycle.name },
        ]}
      />

      <header className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-6 shadow-[var(--id-shadow)]">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--id-accent)]">
          Investment Opportunity
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--id-text)] sm:text-3xl">{cycle.name}</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--id-text-muted)]">
          {cycle.description ?? "A time-bound fundraising and trading period under a verified strategy."}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-[var(--id-accent)]/10 px-3 py-1 text-xs font-semibold text-[var(--id-accent)]">
            {INVESTMENT_CYCLE_STATUS_LABELS[cycle.status]}
          </span>
          {strategy.riskProfile && (
            <span className="rounded-full bg-[var(--id-border)] px-3 py-1 text-xs capitalize text-[var(--id-text-muted)]">
              {strategy.riskProfile.replace(/_/g, " ")} risk
            </span>
          )}
        </div>
        {canAllocate && (
          <Button asChild className="mt-6 rounded-xl [background:var(--id-accent-gradient)] text-white">
            <Link href={`${ROUTES.marketplaceCycles}/${cycle.slug}/commit`}>Commit to this cycle</Link>
          </Button>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5 lg:col-span-2">
          <h2 className="font-semibold text-[var(--id-text)]">Funding Progress</h2>
          <div className="mt-4 rounded-xl bg-navy-950 p-5">
            <PmFundingProgress
              raised={cycle.raisedCapital}
              target={cycle.targetCapital}
              investorCount={cycle.investorCount}
            />
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <Detail label="Target capital" value={cycle.targetCapital != null ? formatCurrency(cycle.targetCapital) : "—"} />
            <Detail label="Current commitments" value={formatCurrency(cycle.raisedCapital)} />
            <Detail label="Remaining capacity" value={remaining != null ? formatCurrency(remaining) : "Open"} />
            <Detail label="Minimum allocation" value={cycle.minInvestment != null ? formatCurrency(cycle.minInvestment) : "—"} />
            <Detail label="Funding deadline" value={cycle.fundingDeadline ? new Date(cycle.fundingDeadline).toLocaleDateString() : "—"} />
            <Detail label="Expected trading period" value={cycle.durationDays != null ? `${cycle.durationDays} days` : "—"} />
          </dl>
        </section>

        <div className="space-y-6">
          <section className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5">
            <h2 className="font-semibold text-[var(--id-text)]">Strategy</h2>
            <Link href={`${ROUTES.marketplaceStrategies}/${strategy.slug}`} className="mt-2 block text-sm font-medium text-[var(--id-accent)] hover:underline">
              {strategy.name}
            </Link>
            <p className="mt-2 text-xs text-[var(--id-text-muted)] line-clamp-3">
              {strategy.objectives ?? strategy.description}
            </p>
          </section>

          <section className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5">
            <h2 className="font-semibold text-[var(--id-text)]">Pool Manager</h2>
            {manager.slug ? (
              <Link href={`${ROUTES.managers}/${manager.slug}`} className="mt-2 block text-sm font-medium text-[var(--id-accent)] hover:underline">
                {manager.name}
              </Link>
            ) : (
              <p className="mt-2 text-sm text-[var(--id-text)]">{manager.name}</p>
            )}
            {manager.rating != null && (
              <p className="mt-1 text-xs text-[var(--id-text-muted)]">Rating: ★ {manager.rating.toFixed(1)} (display only)</p>
            )}
          </section>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5">
          <h2 className="font-semibold text-[var(--id-text)]">Lifecycle Timeline</h2>
          <div className="mt-4">
            <PmCycleLifecycleTimeline currentStatus={cycle.status} />
          </div>
        </section>

        <section className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5">
          <h2 className="font-semibold text-[var(--id-text)]">Risk Information</h2>
          <ul className="mt-4 space-y-2 text-sm text-[var(--id-text-muted)]">
            <li>Capital is committed to a model allocation record — not debited from your wallet in this phase.</li>
            <li>Allocations become immutable once trading begins.</li>
            <li>Past performance does not guarantee future results.</li>
            {strategy.riskProfile && (
              <li className="capitalize">Strategy risk profile: {strategy.riskProfile.replace(/_/g, " ")}.</li>
            )}
          </ul>
        </section>
      </div>

      {operations && <InvestorCycleOperationsPanel operations={operations} />}
      {intelligence && <InvestorCycleIntelligencePanel intelligence={intelligence} />}

      <section className="rounded-[var(--id-radius)] border border-amber-500/20 bg-amber-500/5 p-5 text-sm text-[var(--id-text-muted)]">
        <strong className="text-[var(--id-text)]">Disclaimer:</strong> Investment cycles involve risk of loss.
        Commitments recorded here represent allocation intent under the RyvonX investment model and are not
        connected to wallet debits or deposit flows until a future financial integration phase.
      </section>

      {relatedCycles.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-[var(--id-text)]">Related Opportunities</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedCycles.map((c) => (
              <MarketplaceCycleCard key={c.id} cycle={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[var(--id-text-muted)]">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-[var(--id-text)]">{value}</dd>
    </div>
  );
}
