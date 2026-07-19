"use client";

import { Archive, Users } from "lucide-react";
import type { MarketplaceHeroStats } from "@/features/marketplace/utils/marketplace-stats";

interface MarketplaceHeroProps {
  stats: MarketplaceHeroStats;
}

export function MarketplaceHero({ stats }: MarketplaceHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-[var(--id-shadow-lg)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 100% 0%, rgba(99,102,241,0.18) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(59,130,246,0.12) 0%, transparent 50%)",
        }}
      />
      <div className="relative grid gap-10 p-8 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-12 lg:p-12">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold leading-[1.12] tracking-tight text-[var(--id-text)] sm:text-4xl lg:text-[2.75rem]">
            Choose the Right Investment Pool.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--id-text-secondary)]">
            Browse professionally managed investment pools, compare verified Pool Managers,
            review each pool&apos;s strategy, performance and risk profile, then invest in the
            opportunity that best matches your financial goals.
          </p>
        </div>

        <div className="hidden h-36 w-36 shrink-0 items-center justify-center rounded-full border border-[var(--id-border)] bg-[var(--id-surface-muted)]/60 lg:flex">
          <div className="relative h-24 w-24">
            <div className="absolute inset-0 rounded-full border border-indigo-500/30" />
            <div className="absolute inset-2 rounded-full border border-violet-500/20" />
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-600/10" />
          </div>
        </div>
      </div>

      <div className="relative grid border-t border-[var(--id-border)] sm:grid-cols-2">
        <HeroMetric icon={Archive} label="Live Pools" value={String(stats.livePools)} />
        <HeroMetric icon={Users} label="Active Investors" value={String(stats.activeInvestors)} />
      </div>
    </section>
  );
}

function HeroMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 border-[var(--id-border)] px-6 py-5 sm:border-r last:sm:border-r-0 [&:not(:last-child)]:lg:border-r">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--id-accent-soft)]">
        <Icon className="h-4 w-4 text-[var(--id-accent-text)]" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--id-text-muted)]">
          {label}
        </p>
        <p className="mt-0.5 truncate text-lg font-semibold tabular-nums text-[var(--id-text)]">
          {value}
        </p>
      </div>
    </div>
  );
}
