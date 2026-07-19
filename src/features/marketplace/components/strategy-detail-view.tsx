"use client";

import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import type { Strategy } from "@/domain/investment/types";
import type { InvestorCycleCard, InvestorStrategyCard } from "@/domain/investment/investor-presentation";
import { MarketplaceCycleCard, MarketplaceStrategyCard } from "@/features/marketplace/components/investment-marketplace-cards";
import {
  MarketplaceBreadcrumb,
  marketplaceHomeCrumb,
  managerProfileCrumb,
} from "@/features/marketplace/components/marketplace-breadcrumb";
import { InvestorStrategyIntelligencePanel } from "@/features/investor/components/investment/investor-intelligence-panels";
import type { StrategyIntelligence } from "@/domain/performance-intelligence/types";
import { PmStrategyLifecycleTimeline } from "@/features/pool-manager/components/workspace/pm-lifecycle-timeline";

const FAQ = [
  {
    q: "What is a Strategy?",
    a: "A Strategy is a permanent investment methodology defined by a Pool Manager. It describes how capital will be deployed across market conditions.",
  },
  {
    q: "How do Investment Cycles work?",
    a: "Cycles are time-bound fundraising and trading periods under a Strategy. You commit during the funding phase; allocations lock when trading begins.",
  },
  {
    q: "Is my wallet debited when I commit?",
    a: "Not in this phase. Commitments create allocation records. Wallet and deposit integration is planned for a future release.",
  },
];

export function StrategyDetailView({
  strategy,
  cycles,
  manager,
  relatedStrategies,
  intelligence,
}: {
  strategy: Strategy;
  cycles: InvestorCycleCard[];
  manager: { id: string; name: string; slug: string | null; rating: number | null };
  relatedStrategies: InvestorStrategyCard[];
  intelligence?: StrategyIntelligence | null;
}) {
  const fundingCycles = cycles.filter((c) => c.status === "funding");

  return (
    <div className="space-y-8 pb-10">
      <MarketplaceBreadcrumb
        items={[
          marketplaceHomeCrumb(),
          manager.slug
            ? managerProfileCrumb(manager.slug, manager.name)
            : { label: manager.name },
          { label: strategy.name },
        ]}
      />

      <header className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-6 shadow-[var(--id-shadow)]">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--id-accent)]">Strategy</p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--id-text)] sm:text-3xl">{strategy.name}</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--id-text-muted)]">
          {strategy.description ?? "Professional investment methodology with defined risk parameters."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {strategy.riskProfile && (
            <span className="rounded-full bg-[var(--id-border)] px-3 py-1 text-xs capitalize text-[var(--id-text-muted)]">
              {strategy.riskProfile.replace(/_/g, " ")}
            </span>
          )}
          {strategy.investmentStyle && (
            <span className="rounded-full bg-[var(--id-border)] px-3 py-1 text-xs text-[var(--id-text-muted)]">
              {strategy.investmentStyle}
            </span>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          {strategy.objectives && (
            <div className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5">
              <h2 className="font-semibold text-[var(--id-text)]">Objectives</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--id-text-muted)]">{strategy.objectives}</p>
            </div>
          )}

          <div className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5">
            <h2 className="font-semibold text-[var(--id-text)]">Overview</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Detail label="Risk profile" value={strategy.riskProfile?.replace(/_/g, " ") ?? "—"} />
              <Detail label="Investment style" value={strategy.investmentStyle ?? "—"} />
              <Detail label="Asset classes" value={strategy.supportedAssets.join(", ") || "—"} />
              <Detail label="Expected holding period" value="Defined per cycle" />
            </dl>
          </div>

          <div className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5">
            <h2 className="font-semibold text-[var(--id-text)]">Active Investment Cycles</h2>
            {cycles.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--id-text-muted)]">No public cycles under this strategy yet.</p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {cycles.map((cycle) => (
                  <MarketplaceCycleCard key={cycle.id} cycle={cycle} />
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5">
            <h2 className="font-semibold text-[var(--id-text)]">Pool Manager</h2>
            {manager.slug ? (
              <Link href={`${ROUTES.managers}/${manager.slug}`} className="mt-2 block text-sm font-medium text-[var(--id-accent)] hover:underline">
                {manager.name}
              </Link>
            ) : (
              <p className="mt-2 text-sm">{manager.name}</p>
            )}
            {manager.rating != null && (
              <p className="mt-1 text-xs text-[var(--id-text-muted)]">Rating ★ {manager.rating.toFixed(1)}</p>
            )}
          </section>

          <section className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5">
            <h2 className="font-semibold text-[var(--id-text)]">Lifecycle</h2>
            <div className="mt-4">
              <PmStrategyLifecycleTimeline currentStatus={strategy.status} />
            </div>
          </section>

          {fundingCycles.length > 0 && (
            <section className="rounded-[var(--id-radius)] border border-[var(--id-accent)]/30 bg-[var(--id-accent)]/5 p-5">
              <h2 className="font-semibold text-[var(--id-text)]">Open for funding</h2>
              <p className="mt-2 text-sm text-[var(--id-text-muted)]">
                {fundingCycles.length} cycle{fundingCycles.length === 1 ? "" : "s"} accepting commitments.
              </p>
              <Link
                href={`${ROUTES.marketplaceCycles}/${fundingCycles[0]!.slug}`}
                className="mt-3 inline-block text-sm font-medium text-[var(--id-accent)] hover:underline"
              >
                View opportunity →
              </Link>
            </section>
          )}
        </div>
      </div>

      {intelligence && <InvestorStrategyIntelligencePanel intelligence={intelligence} />}

      <section className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5">
        <h2 className="font-semibold text-[var(--id-text)]">Frequently Asked Questions</h2>
        <dl className="mt-4 space-y-4">
          {FAQ.map((item) => (
            <div key={item.q}>
              <dt className="text-sm font-medium text-[var(--id-text)]">{item.q}</dt>
              <dd className="mt-1 text-sm text-[var(--id-text-muted)]">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {relatedStrategies.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-[var(--id-text)]">Related Strategies</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedStrategies.map((s) => (
              <MarketplaceStrategyCard key={s.id} strategy={s} />
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
      <dd className="mt-1 text-sm capitalize text-[var(--id-text)]">{value}</dd>
    </div>
  );
}
