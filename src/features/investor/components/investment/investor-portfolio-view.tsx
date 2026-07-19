"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROUTES } from "@/constants/routes";
import { INVESTMENT_ALLOCATION_STATUS_LABELS } from "@/constants/investment-allocation";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { InvestorPortfolioData } from "@/domain/investment/investor-presentation";
import { cancelAllocation } from "@/features/investor/components/investment/investor-allocation-api";
import { WalletHeroCard } from "@/features/investor/components/wallet-hero-card";
import { PoolProfitActions } from "@/features/investor/components/pool-profit-actions";
import {
  investorPageSubtitleClass,
  investorPageTitleClass,
} from "@/features/investor/constants/ui";

export function InvestorPortfolioView({ data }: { data: InvestorPortfolioData }) {
  const router = useRouter();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const walletSummary = {
    balance: data.balance,
    poolProfit: data.legacyParticipations.reduce((s, p) => s + p.poolProfit, 0),
    participations: data.legacyParticipations,
  };

  async function handleCancel(id: string) {
    setCancellingId(id);
    setError(null);
    try {
      await cancelAllocation(id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className={investorPageTitleClass}>Portfolio</h1>
        <p className={investorPageSubtitleClass}>
          How is my money positioned? Cycle commitments and legacy pool holdings.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Wallet balance" value={formatCurrency(data.balance)} />
        <Metric label="Cycle commitments" value={formatCurrency(data.totalCommittedCycles)} />
        <Metric label="Legacy pool capital" value={formatCurrency(data.totalInvestedLegacy)} />
      </div>

      <WalletHeroCard investment={walletSummary} />

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {data.pendingAllocations.length > 0 && (
        <section className="overflow-hidden rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-[var(--id-shadow)]">
          <div className="border-b border-[var(--id-border)] px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--id-text)]">Pending Allocations</h2>
          </div>
          <ul className="divide-y divide-[var(--id-border)]">
            {data.pendingAllocations.map((a) => (
              <li key={a.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link href={`${ROUTES.marketplaceCycles}/${a.cycleSlug}`} className="font-medium text-[var(--id-accent)] hover:underline">
                    {a.cycleName}
                  </Link>
                  <p className="text-xs text-[var(--id-text-muted)]">
                    {a.strategyName} · {a.managerName} · {a.referenceNumber}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold tabular-nums">{formatCurrency(a.amount)}</span>
                  {a.canCancel && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={cancellingId === a.id}
                      onClick={() => handleCancel(a.id)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.activeAllocations.length > 0 && (
        <section className="overflow-hidden rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-[var(--id-shadow)]">
          <div className="border-b border-[var(--id-border)] px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--id-text)]">Active Cycle Commitments</h2>
          </div>
          <ul className="divide-y divide-[var(--id-border)]">
            {data.activeAllocations.map((a) => (
              <li key={a.id} className="flex justify-between px-5 py-4">
                <div>
                  <p className="font-medium text-[var(--id-text)]">{a.cycleName}</p>
                  <p className="text-xs text-[var(--id-text-muted)]">
                    {INVESTMENT_ALLOCATION_STATUS_LABELS[a.status]} · {a.strategyName}
                  </p>
                </div>
                <span className="font-semibold tabular-nums">{formatCurrency(a.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {data.strategyExposure.length > 0 && (
          <section className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5">
            <h2 className="font-semibold text-[var(--id-text)]">Strategy Exposure</h2>
            <ul className="mt-4 space-y-3">
              {data.strategyExposure.map((item) => (
                <li key={item.strategyName} className="flex justify-between text-sm">
                  <span>{item.strategyName}</span>
                  <span className="font-medium tabular-nums">{formatCurrency(item.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {data.riskExposure.length > 0 && (
          <section className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5">
            <h2 className="font-semibold text-[var(--id-text)]">Risk Allocation</h2>
            <ul className="mt-4 space-y-3">
              {data.riskExposure.map((item) => (
                <li key={item.label}>
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{item.label}</span>
                    <span>{item.pct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--id-border)]">
                    <div className="h-full bg-[var(--id-accent)]" style={{ width: `${item.pct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {data.timeline.length > 0 && (
        <section className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5">
          <h2 className="font-semibold text-[var(--id-text)]">Investment Timeline</h2>
          <ul className="mt-4 space-y-2">
            {data.timeline.map((item, i) => (
              <li key={`${item.label}-${i}`} className="flex justify-between text-sm">
                <span className="text-[var(--id-text)]">{item.label}</span>
                <span className="text-[var(--id-text-muted)]">
                  {new Date(item.date).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.legacyParticipations.length > 0 && (
        <section className="overflow-hidden rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-[var(--id-shadow)]">
          <div className="border-b border-[var(--id-border)] px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--id-text)]">Legacy Pool Holdings</h2>
          </div>
          <ul className="divide-y divide-[var(--id-border)]">
            {data.legacyParticipations.map((pool) => (
              <li key={pool.fundId} className="space-y-4 px-5 py-5">
                <div className="flex justify-between">
                  <p className="font-semibold">{pool.poolName}</p>
                  <p className="font-mono font-semibold">{formatCurrency(pool.amountInvested)}</p>
                </div>
                <PoolProfitActions
                  fundId={pool.fundId}
                  poolName={pool.poolName}
                  availableProfit={pool.poolProfit}
                  compact
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <Button asChild className="rounded-xl [background:var(--id-accent-gradient)] text-white">
          <Link href={ROUTES.marketplace}>Find opportunities</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={ROUTES.investments}>Legacy investments</Link>
        </Button>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] px-4 py-3">
      <p className="text-xs text-[var(--id-text-muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--id-text)]">{value}</p>
    </div>
  );
}
