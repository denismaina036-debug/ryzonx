"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookOpen, ChevronRight, Play, Trash2 } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import type { Pool } from "@/domain/pools/types";
import type { InvestmentCycle } from "@/domain/investment/types";
import type { Strategy } from "@/domain/investment/types";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import {
  pmCardClass,
  pmLinkClass,
  pmPrimaryButtonClass,
  pmSecondaryButtonClass,
  pmStatLabelClass,
} from "@/features/pool-manager/constants/ui";
import { ryvonxEmptyStateShellClass } from "@/lib/ui/ryvonx-tokens";
import { PmPageHeader, PmFormMessage } from "@/features/pool-manager/components/workspace/pm-page-header";
import { PmFundingProgress } from "@/features/pool-manager/components/workspace/pm-funding-progress";
import { PmStatusBadge } from "@/features/pool-manager/components/workspace/pm-status-badge";
import { transitionCycle } from "@/features/pool-manager/components/workspace/pm-api";
import {
  canOpenJournal,
  canStartTrading,
  resolveActivePoolCycle,
} from "@/features/pool-manager/utils/pool-cycle-presentation";
import { isCycleFundingPhase, isCycleTradingPhase } from "@/lib/investment/cycle-display-phase";
import {
  poolBadgeStatus,
  simplifyCycleStatus,
  simplifyPoolLifecycleStatus,
} from "@/features/pool-manager/utils/pm-status-presentation";

export interface ManagedPoolListItem {
  pool: Pool;
  cycles: InvestmentCycle[];
}

interface ManagedPoolListClientProps {
  items: ManagedPoolListItem[];
  strategies: Strategy[];
}

export function ManagedPoolListClient({ items, strategies }: ManagedPoolListClientProps) {
  const router = useRouter();
  const [loadingPoolId, setLoadingPoolId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasApprovedStrategy = strategies.some((s) =>
    ["approved", "available", "operating", "paused"].includes(s.status)
  );

  async function submitPool(poolId: string) {
    setLoadingPoolId(poolId);
    setError(null);
    try {
      const res = await fetch(`/api/pool-manager/managed-pools/${poolId}/submit`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submit failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setLoadingPoolId(null);
    }
  }

  async function deletePool(poolId: string, poolName: string) {
    const confirmed = window.confirm(
      `Delete "${poolName}"? All invested funds will be returned to investors' funding wallets.`
    );
    if (!confirmed) return;

    setLoadingPoolId(poolId);
    setError(null);
    try {
      const res = await fetch(`/api/pool-manager/managed-pools/${poolId}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string; returnedTotal?: number; investorCount?: number };
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setLoadingPoolId(null);
    }
  }

  async function startTrading(poolId: string, cycleId: string) {
    setLoadingPoolId(poolId);
    setError(null);
    try {
      await transitionCycle(cycleId, "trading");
      router.push(`${ROUTES.poolManagerInvestmentCycles}/${cycleId}/journal`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start trading");
      setLoadingPoolId(null);
    }
  }

  return (
    <div className="space-y-8">
      <PmPageHeader
        hero
        eyebrow="Pool Manager"
        title="My Pools"
        description="Create a strategy, launch a pool, and manage investment cycles from one place."
        actions={
          hasApprovedStrategy ? (
            <Button asChild className={pmPrimaryButtonClass}>
              <Link href={`${ROUTES.poolManagerPools}/new`}>Create Pool</Link>
            </Button>
          ) : (
            <Button asChild className={pmPrimaryButtonClass}>
              <Link href={`${ROUTES.poolManagerStrategies}/new`}>Create Strategy</Link>
            </Button>
          )
        }
      />

      <PmFormMessage message={error} variant="error" />

      {items.length === 0 ? (
        <EmptyWorkspace hasStrategies={strategies.length > 0} hasApprovedStrategy={hasApprovedStrategy} />
      ) : (
        <div className="space-y-4">
          {items.map(({ pool, cycles }) => {
            const lifecycle = pool.lifecycleStatus ?? "draft";
            const label = simplifyPoolLifecycleStatus(lifecycle);
            const activeCycle = resolveActivePoolCycle(cycles);
            const isLoading = loadingPoolId === pool.id;

            return (
              <article
                key={pool.id}
                className="rounded-2xl border border-[var(--id-border)] bg-[var(--id-surface)] p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`${ROUTES.poolManagerPools}/${pool.id}`}
                        className="text-lg font-semibold text-[var(--id-text)] hover:text-[var(--pm-accent-text)]"
                      >
                        {pool.name}
                      </Link>
                      <PmStatusBadge label={label} status={poolBadgeStatus(lifecycle)} />
                      {activeCycle && (
                        <PmStatusBadge
                          label={simplifyCycleStatus(activeCycle.status)}
                          status={activeCycle.status}
                        />
                      )}
                    </div>

                    {cycles.length > 0 ? (
                      <PoolCyclesList
                        pool={pool}
                        cycles={cycles}
                        loadingPoolId={loadingPoolId}
                        onStartTrading={(cycleId) => void startTrading(pool.id, cycleId)}
                      />
                    ) : lifecycle === "draft" ? (
                      <p className="text-sm text-[var(--id-text-muted)]">
                        Submit your pool for RyvonX review. Cycle 1 is created when approved.
                      </p>
                    ) : (
                      <p className="text-sm text-[var(--id-text-muted)]">
                        No cycles yet. Open the pool to manage cycles.
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {lifecycle === "draft" && (
                      <>
                        <Button size="sm" variant="outline" className={pmSecondaryButtonClass} asChild>
                          <Link href={`${ROUTES.poolManagerPools}/${pool.id}`}>Edit Pool</Link>
                        </Button>
                        <Button
                          size="sm"
                          disabled={isLoading}
                          className={pmPrimaryButtonClass}
                          onClick={() => void submitPool(pool.id)}
                        >
                          Submit for Review
                        </Button>
                      </>
                    )}

                    <Button size="sm" variant="outline" className={pmSecondaryButtonClass} asChild>
                      <Link href={`${ROUTES.poolManagerPools}/${pool.id}`}>Manage Pool</Link>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className={pmSecondaryButtonClass}
                      disabled={isLoading}
                      onClick={() => void deletePool(pool.id, pool.name)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Delete
                    </Button>

                    {lifecycle === "live" && pool.slug && (
                      <Link
                        href={`${ROUTES.marketplace}/${pool.slug}`}
                        className={`inline-flex items-center px-3 py-2 text-sm ${pmLinkClass}`}
                      >
                        Marketplace
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PoolCyclesList({
  pool,
  cycles,
  loadingPoolId,
  onStartTrading,
}: {
  pool: Pool;
  cycles: InvestmentCycle[];
  loadingPoolId: string | null;
  onStartTrading: (cycleId: string) => void;
}) {
  const sorted = [...cycles].sort((a, b) => b.cycleNumber - a.cycleNumber);
  const isLoading = loadingPoolId === pool.id;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--id-text-faint)]">
        Cycles ({sorted.length})
      </p>
      <ul className="space-y-2">
        {sorted.map((cycle) => {
          const detailHref = `${ROUTES.poolManagerInvestmentCycles}/${cycle.id}`;
          const target =
            cycle.targetCapital != null && cycle.targetCapital > 0
              ? cycle.targetCapital
              : pool.targetCapital > 0
                ? pool.targetCapital
                : null;
          const isFunding = isCycleFundingPhase(cycle.status);
          const isTrading = isCycleTradingPhase(cycle.status);
          const showStartTrading = pool.lifecycleStatus === "live" && canStartTrading(cycle);
          const showJournal = pool.lifecycleStatus === "live" && canOpenJournal(cycle);

          return (
            <li key={cycle.id}>
              <div
                className={cn(
                  pmCardClass,
                  "overflow-hidden transition-colors hover:border-[var(--pm-accent-border)]"
                )}
              >
                <Link
                  href={detailHref}
                  className="flex items-start gap-3 p-4 transition-colors hover:bg-[var(--id-surface-hover)]"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--pm-accent-soft)] text-xs font-bold text-[var(--pm-accent-text)]">
                    #{cycle.cycleNumber}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium text-[var(--id-text)]">
                        {cycle.name || `Cycle ${cycle.cycleNumber}`}
                      </p>
                      <PmStatusBadge
                        label={simplifyCycleStatus(cycle.status)}
                        status={cycle.status}
                      />
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                      <div>
                        <dt className={pmStatLabelClass}>
                          {isTrading ? "Capital Traded" : "Raised"}
                        </dt>
                        <dd className="font-semibold tabular-nums text-[var(--id-text)]">
                          {formatCurrency(cycle.raisedCapital ?? 0)}
                        </dd>
                      </div>
                      {isTrading && target != null && target > 0 && (
                        <div>
                          <dt className={pmStatLabelClass}>Total Capital Under Management</dt>
                          <dd className="font-semibold tabular-nums text-[var(--id-text)]">
                            {formatCurrency(target)}
                          </dd>
                        </div>
                      )}
                      <div>
                        <dt className={pmStatLabelClass}>Investors</dt>
                        <dd className="font-semibold tabular-nums text-[var(--id-text)]">
                          {cycle.investorCount ?? 0}
                        </dd>
                      </div>
                      {isTrading && (
                        <div>
                          <dt className={pmStatLabelClass}>Cycle P/L</dt>
                          <dd
                            className={cn(
                              "font-semibold tabular-nums",
                              (cycle.currentCycleProfit ?? 0) > 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : (cycle.currentCycleProfit ?? 0) < 0
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-[var(--id-text)]"
                            )}
                          >
                            {formatCurrency(cycle.currentCycleProfit ?? 0)}
                          </dd>
                        </div>
                      )}
                    </dl>
                    {isFunding && target != null && target > 0 && (
                      <div className="mt-3">
                        <PmFundingProgress
                          compact
                          raised={cycle.raisedCapital ?? 0}
                          target={target}
                          investorCount={cycle.investorCount ?? 0}
                        />
                      </div>
                    )}
                  </div>
                  <ChevronRight
                    className="mt-1 h-5 w-5 shrink-0 text-[var(--id-text-faint)]"
                    aria-hidden
                  />
                </Link>

                {(showStartTrading || showJournal) && (
                  <div className="flex flex-wrap gap-2 border-t border-[var(--id-border)] bg-[var(--id-surface-muted)] px-4 py-2.5">
                    {showStartTrading && (
                      <Button
                        size="sm"
                        disabled={isLoading}
                        className={pmPrimaryButtonClass}
                        onClick={(event) => {
                          event.preventDefault();
                          onStartTrading(cycle.id);
                        }}
                      >
                        <Play className="mr-1.5 h-3.5 w-3.5" />
                        Start Trading
                      </Button>
                    )}
                    {showJournal && (
                      <Button size="sm" className={pmPrimaryButtonClass} asChild>
                        <Link href={`${ROUTES.poolManagerInvestmentCycles}/${cycle.id}/journal`}>
                          <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                          Open Journal
                        </Link>
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className={pmSecondaryButtonClass} asChild>
                      <Link href={detailHref}>View details</Link>
                    </Button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EmptyWorkspace({
  hasStrategies,
  hasApprovedStrategy,
}: {
  hasStrategies: boolean;
  hasApprovedStrategy: boolean;
}) {
  return (
    <div className={cn(ryvonxEmptyStateShellClass, "sm:p-10")}>
      <p className="text-base font-semibold text-[var(--id-text)]">Get started in two steps</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--id-text-muted)]">
        Record your trading strategy first, then create a pool that uses it. Your first cycle
        opens automatically when the pool is approved.
      </p>
      <ol className="mx-auto mt-6 max-w-sm space-y-3 text-left text-sm">
        <li className="flex gap-3 rounded-xl border border-[var(--id-border)] bg-[var(--id-surface)] px-4 py-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--pm-accent-soft)] text-xs font-bold text-[var(--pm-accent-text)]">
            1
          </span>
          <div>
            <p className="font-medium text-[var(--id-text)]">Create a strategy</p>
            <p className="text-xs text-[var(--id-text-muted)]">
              {hasStrategies
                ? "View or submit your strategies for approval."
                : "Define how you trade — reviewed by RyvonX."}
            </p>
          </div>
        </li>
        <li className="flex gap-3 rounded-xl border border-[var(--id-border)] bg-[var(--id-surface)] px-4 py-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--pm-accent-soft)] text-xs font-bold text-[var(--pm-accent-text)]">
            2
          </span>
          <div>
            <p className="font-medium text-[var(--id-text)]">Create a pool</p>
            <p className="text-xs text-[var(--id-text-muted)]">
              {hasApprovedStrategy
                ? "Attach your approved strategy and submit for review."
                : "Available once a strategy is approved."}
            </p>
          </div>
        </li>
      </ol>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {!hasStrategies && (
          <Button asChild className={pmPrimaryButtonClass}>
            <Link href={`${ROUTES.poolManagerStrategies}/new`}>Create Strategy</Link>
          </Button>
        )}
        {hasStrategies && !hasApprovedStrategy && (
          <Button asChild variant="outline" className={pmSecondaryButtonClass}>
            <Link href={ROUTES.poolManagerStrategies}>View Strategies</Link>
          </Button>
        )}
        {hasApprovedStrategy && (
          <Button asChild className={pmPrimaryButtonClass}>
            <Link href={`${ROUTES.poolManagerPools}/new`}>Create Pool</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
