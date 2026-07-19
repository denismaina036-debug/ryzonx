"use client";

import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { STRATEGY_RISK_PROFILES } from "@/constants/strategy";
import { formatCurrency } from "@/lib/utils";
import type { InvestorCycleCard, InvestorStrategyCard } from "@/domain/investment/investor-presentation";
import { INVESTMENT_CYCLE_STATUS_LABELS } from "@/constants/investment-cycle";

export function MarketplaceCycleCard({ cycle }: { cycle: InvestorCycleCard }) {
  const href = `${ROUTES.marketplaceCycles}/${cycle.slug}`;

  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5 shadow-[var(--id-shadow)] transition-all duration-200 hover:border-[var(--id-accent)]/35 hover:shadow-[var(--id-shadow-lg)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--id-text-muted)]">
            {cycle.strategyName}
          </p>
          <h3 className="mt-1 text-base font-semibold text-[var(--id-text)] group-hover:text-[var(--id-accent)]">
            {cycle.name}
          </h3>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--id-accent)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--id-accent)]">
          {INVESTMENT_CYCLE_STATUS_LABELS[cycle.status]}
        </span>
      </div>

      <p className="mt-2 line-clamp-2 text-sm text-[var(--id-text-muted)]">
        {cycle.description ?? `Managed by ${cycle.managerName}`}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-[var(--id-text-muted)]">Raised</p>
          <p className="font-semibold tabular-nums text-[var(--id-text)]">
            {formatCurrency(cycle.raisedCapital)}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--id-text-muted)]">Min. investment</p>
          <p className="font-semibold tabular-nums text-[var(--id-text)]">
            {cycle.minInvestment != null ? formatCurrency(cycle.minInvestment) : "—"}
          </p>
        </div>
      </div>

      {cycle.fundingPct != null && (
        <div className="mt-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--id-border)]">
            <div
              className="h-full rounded-full bg-[var(--id-accent)] transition-all"
              style={{ width: `${cycle.fundingPct}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-[var(--id-text-muted)]">{cycle.fundingPct}% funded</p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-[var(--id-text-muted)]">
        <span>{cycle.managerName}</span>
        {cycle.riskProfile && (
          <span className="capitalize">{cycle.riskProfile.replace(/_/g, " ")}</span>
        )}
      </div>

      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--id-accent)]">
        View opportunity
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export function MarketplaceStrategyCard({ strategy }: { strategy: InvestorStrategyCard }) {
  const href = `${ROUTES.marketplaceStrategies}/${strategy.slug}`;

  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5 shadow-[var(--id-shadow)] transition-all duration-200 hover:border-[var(--id-accent)]/35 hover:shadow-[var(--id-shadow-lg)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--id-text-muted)]">
            Strategy
          </p>
          <h3 className="mt-1 text-base font-semibold text-[var(--id-text)] group-hover:text-[var(--id-accent)]">
            {strategy.name}
          </h3>
        </div>
        <TrendingUp className="h-5 w-5 text-[var(--id-accent)]/60" />
      </div>

      <p className="mt-2 line-clamp-2 text-sm text-[var(--id-text-muted)]">
        {strategy.description ?? strategy.investmentStyle ?? "Professional investment methodology"}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {strategy.riskProfile && (
          <span className="rounded-full bg-[var(--id-border)] px-2 py-0.5 text-[10px] font-medium capitalize text-[var(--id-text-muted)]">
            {strategy.riskProfile.replace(/_/g, " ")}
          </span>
        )}
        {strategy.supportedAssets.slice(0, 3).map((asset) => (
          <span
            key={asset}
            className="rounded-full bg-[var(--id-border)] px-2 py-0.5 text-[10px] font-medium text-[var(--id-text-muted)]"
          >
            {asset}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-[var(--id-text-muted)]">
        <span>{strategy.managerName}</span>
        <span>{strategy.activeCyclesCount} active cycle{strategy.activeCyclesCount === 1 ? "" : "s"}</span>
      </div>

      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--id-accent)]">
        View strategy
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export const STRATEGY_RISK_FILTER_OPTIONS = STRATEGY_RISK_PROFILES.map((value) => ({
  value,
  label: value.replace(/_/g, " "),
}));
