"use client";

import Link from "next/link";
import { ArrowRight, Briefcase, Sparkles, TrendingUp } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { formatCurrency } from "@/lib/utils";
import type { InvestorHomeData } from "@/domain/investment/investor-presentation";
import { MarketplaceCycleCard, MarketplaceStrategyCard } from "@/features/marketplace/components/investment-marketplace-cards";

export function InvestorHomeInvestmentPanel({ data }: { data: InvestorHomeData }) {
  return (
    <div className="space-y-8">
      <section className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5 shadow-[var(--id-shadow)] sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--id-accent)]">
              Investment Overview
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--id-text)]">
              What should I invest in today?
            </h2>
          </div>
          <Link href={ROUTES.marketplace} className="text-sm font-medium text-[var(--id-accent)] hover:underline">
            Browse marketplace →
          </Link>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <SummaryTile label="Wallet balance" value={formatCurrency(data.portfolioSummary.balance)} />
          <SummaryTile
            label="Cycle commitments"
            value={formatCurrency(data.portfolioSummary.cycleCommitted)}
          />
          <SummaryTile
            label="Pending allocations"
            value={String(data.portfolioSummary.pendingCount)}
            highlight={data.portfolioSummary.pendingCount > 0}
          />
        </div>
      </section>

      {data.recommendedCycles.length > 0 && (
        <section>
          <SectionHeader
            title="Recommended Opportunities"
            subtitle="Investment cycles currently open for funding"
            href={ROUTES.marketplace}
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.recommendedCycles.slice(0, 3).map((cycle) => (
              <MarketplaceCycleCard key={cycle.id} cycle={cycle} />
            ))}
          </div>
        </section>
      )}

      {data.featuredManagers.length > 0 && (
        <section>
          <SectionHeader title="Featured Pool Managers" href={ROUTES.marketplace} />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.featuredManagers.map((manager) => (
              <Link
                key={manager.id}
                href={manager.slug ? `${ROUTES.managers}/${manager.slug}` : ROUTES.marketplace}
                className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-4 shadow-[var(--id-shadow)] transition hover:border-[var(--id-accent)]/40"
              >
                <p className="font-semibold text-[var(--id-text)]">{manager.displayName}</p>
                <p className="mt-1 text-xs text-[var(--id-text-muted)] capitalize">
                  {manager.tradingStyle?.replace(/_/g, " ") ?? "Professional manager"}
                </p>
                <div className="mt-3 flex justify-between text-xs text-[var(--id-text-muted)]">
                  <span>{manager.activeInvestors} investors</span>
                  {manager.ryvonxRating != null && <span>★ {manager.ryvonxRating.toFixed(1)}</span>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {data.recentStrategies.length > 0 && (
          <section>
            <SectionHeader title="Recently Approved Strategies" icon={TrendingUp} />
            <div className="mt-4 space-y-3">
              {data.recentStrategies.slice(0, 3).map((strategy) => (
                <MarketplaceStrategyCard key={strategy.id} strategy={strategy} />
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionHeader
            title="Investment Insights"
            subtitle="Analytics and ratings — coming with Trading Engine"
            icon={Sparkles}
          />
          <div className="mt-4 rounded-[var(--id-radius)] border border-dashed border-[var(--id-border)] bg-[var(--id-surface)]/50 p-6 text-sm text-[var(--id-text-muted)]">
            Personalized performance insights, dynamic ratings, and cycle analytics will appear here
            once trading data is available. Explore funding opportunities in the marketplace today.
          </div>

          {data.pendingAllocations.length > 0 && (
            <div className="mt-4 rounded-[var(--id-radius)] border border-amber-500/30 bg-amber-500/5 p-4">
              <p className="text-sm font-medium text-[var(--id-text)]">
                {data.pendingAllocations.length} pending allocation
                {data.pendingAllocations.length === 1 ? "" : "s"}
              </p>
              <Link href={ROUTES.portfolio} className="mt-2 inline-block text-sm text-[var(--id-accent)] hover:underline">
                Review portfolio →
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--id-border)] bg-[var(--id-bg)]/40 px-4 py-3">
      <p className="text-xs text-[var(--id-text-muted)]">{label}</p>
      <p
        className={`mt-1 text-lg font-semibold tabular-nums ${
          highlight ? "text-amber-600" : "text-[var(--id-text)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  href,
  icon: Icon,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  icon?: typeof Briefcase;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-[var(--id-accent)]" />}
          <h2 className="text-base font-semibold text-[var(--id-text)]">{title}</h2>
        </div>
        {subtitle && <p className="mt-1 text-sm text-[var(--id-text-muted)]">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex items-center gap-1 text-sm text-[var(--id-accent)] hover:underline">
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
