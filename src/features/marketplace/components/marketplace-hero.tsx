"use client";

import { Users } from "lucide-react";

interface MarketplaceHeroProps {
  totalInvestors: number;
}
export function MarketplaceHero({ totalInvestors }: MarketplaceHeroProps) {
  return (
    <>
      <section className="md:hidden">
        <h1 className="text-[1.45rem] font-semibold leading-snug tracking-tight text-[var(--id-text)]">
          Find Your Investment Pool
        </h1>
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-[var(--id-text-muted)]">
          Verified managers. Transparent strategies. Built for informed investing.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[var(--id-border)] bg-[var(--id-surface)] px-3 py-2 text-xs text-[var(--id-text-muted)] shadow-sm">
          <Users className="h-3.5 w-3.5 text-[var(--id-accent-text)]" aria-hidden />
          <span>Total Investors</span>
          <span className="font-semibold tabular-nums text-[var(--id-text)]">{totalInvestors}</span>
        </div>
      </section>

      <section className="relative hidden overflow-hidden rounded-2xl border border-[var(--id-border)] bg-[linear-gradient(105deg,var(--id-surface)_0%,var(--id-surface-muted)_100%)] shadow-[var(--id-shadow)] md:block">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{ background: "radial-gradient(ellipse 55% 120% at 100% 0%, rgba(59,130,246,.16), transparent 62%)" }}
        />
        <div className="relative flex items-end justify-between gap-8 p-7 lg:p-9">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold leading-tight tracking-[-0.025em] text-[var(--id-text)] lg:text-4xl">
              Find Your Investment Pool
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-[var(--id-text-secondary)]">
              Verified managers. Transparent strategies. Built for informed investing.
            </p>
          </div>
          <div className="hidden items-center gap-3 rounded-xl border border-[var(--id-border)] bg-[var(--id-surface)]/85 px-5 py-4 shadow-sm backdrop-blur-sm lg:flex">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--id-accent-soft)]">
              <Users className="h-4 w-4 text-[var(--id-accent-text)]" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--id-text-muted)]">Total Investors</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--id-text)]">{totalInvestors}</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
