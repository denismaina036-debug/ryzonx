"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BookOpen, Play, Plus, Trash2 } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import type { Pool } from "@/domain/pools/types";
import type { InvestmentCycle } from "@/domain/investment/types";
import type { Strategy } from "@/domain/investment/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  pmLinkClass,
  pmPrimaryButtonClass,
  pmSecondaryButtonClass,
} from "@/features/pool-manager/constants/ui";
import { ryvonxEmptyStateShellClass } from "@/lib/ui/ryvonx-tokens";
import { PmPageHeader, PmFormMessage } from "@/features/pool-manager/components/workspace/pm-page-header";
import { PmStatusBadge } from "@/features/pool-manager/components/workspace/pm-status-badge";
import { transitionCycle } from "@/features/pool-manager/components/workspace/pm-api";
import {
  canOpenJournal,
  canStartTrading,
  resolveActivePoolCycle,
} from "@/features/pool-manager/utils/pool-cycle-presentation";
import {
  poolBadgeStatus,
  simplifyPoolLifecycleStatus,
} from "@/features/pool-manager/utils/pm-status-presentation";
import {
  PoolCycleRow,
  resolveCanCreateCycle,
  sortCyclesChronologically,
} from "./pool-cycles-section";
import type { ReferralSummary } from "@/domain/referrals/types";
import { ReferralCard } from "@/features/referrals/components/referral-card";

export interface ManagedPoolListItem {
  pool: Pool;
  cycles: InvestmentCycle[];
}

interface ManagedPoolListClientProps {
  items: ManagedPoolListItem[];
  strategies: Strategy[];
  referralSummary: ReferralSummary;
}

export function ManagedPoolListClient({
  items,
  strategies,
  referralSummary,
}: ManagedPoolListClientProps) {
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
      const data = (await res.json()) as { error?: string };
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
        description="A pool is your long-term product. Inside each pool, open short-term funding cycles — Cycle 1, Cycle 2, and so on. Creating a cycle never creates a new pool."
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

      <ReferralCard summary={referralSummary} />

      <PmFormMessage message={error} variant="error" />

      {items.length === 0 ? (
        <EmptyWorkspace hasStrategies={strategies.length > 0} hasApprovedStrategy={hasApprovedStrategy} />
      ) : (
        <div className="space-y-6">
          {items.map(({ pool, cycles }) => (
            <PoolContainer
              key={pool.id}
              pool={pool}
              cycles={cycles}
              loadingPoolId={loadingPoolId}
              onSubmitPool={() => void submitPool(pool.id)}
              onDeletePool={() => void deletePool(pool.id, pool.name)}
              onStartTrading={(cycleId) => void startTrading(pool.id, cycleId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PoolContainer({
  pool,
  cycles,
  loadingPoolId,
  onSubmitPool,
  onDeletePool,
  onStartTrading,
}: {
  pool: Pool;
  cycles: InvestmentCycle[];
  loadingPoolId: string | null;
  onSubmitPool: () => void;
  onDeletePool: () => void;
  onStartTrading: (cycleId: string) => void;
}) {
  const lifecycle = pool.lifecycleStatus ?? "draft";
  const label = simplifyPoolLifecycleStatus(lifecycle);
  const activeCycle = resolveActivePoolCycle(cycles);
  const isLoading = loadingPoolId === pool.id;
  const sortedCycles = useMemo(() => sortCyclesChronologically(cycles), [cycles]);
  const canCreate = resolveCanCreateCycle(cycles, lifecycle === "live");
  const nextCycleNumber = (sortedCycles[sortedCycles.length - 1]?.cycleNumber ?? 0) + 1;

  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--id-border)] bg-[var(--id-surface)] shadow-sm">
      <div className="border-b border-[var(--id-border)] bg-[var(--id-surface-muted)] px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--id-text-faint)]">
              Pool
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Link
                href={`${ROUTES.poolManagerPools}/${pool.id}`}
                className="text-xl font-semibold text-[var(--id-text)] hover:text-[var(--pm-accent-text)]"
              >
                {pool.name}
              </Link>
              <PmStatusBadge label={label} status={poolBadgeStatus(lifecycle)} />
              {activeCycle && (
                <PmStatusBadge label="Active cycle open" status={activeCycle.status} />
              )}
            </div>
            <p className="mt-1 max-w-2xl text-sm text-[var(--id-text-muted)]">
              Long-term pool profile — strategy, branding, and marketplace presence. Funding happens
              inside cycles below.
            </p>
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
                  onClick={onSubmitPool}
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
              onClick={onDeletePool}
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
      </div>

      <div className="border-l-4 border-[var(--pm-accent-border)] px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--pm-accent-text)]">
              Cycles in this pool
            </p>
            <p className="mt-0.5 text-sm text-[var(--id-text-muted)]">
              {sortedCycles.length === 0
                ? "Cycle 1 opens when the pool goes live."
                : `${sortedCycles.length} cycle${sortedCycles.length === 1 ? "" : "s"} — each is a separate funding round.`}
            </p>
          </div>
          {canCreate && (
            <Button size="sm" className={pmPrimaryButtonClass} asChild>
              <Link href={`${ROUTES.poolManagerNewCycle}?poolId=${pool.id}`}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Open cycle {nextCycleNumber}
              </Link>
            </Button>
          )}
        </div>

        {sortedCycles.length > 0 ? (
          <ul className="mt-5 space-y-3">
            {sortedCycles.map((cycle) => {
              const detailHref = `${ROUTES.poolManagerInvestmentCycles}/${cycle.id}`;
              const showStartTrading = pool.lifecycleStatus === "live" && canStartTrading(cycle);
              const showJournal = pool.lifecycleStatus === "live" && canOpenJournal(cycle);

              return (
                <li key={cycle.id} className="space-y-2">
                  <PoolCycleRow cycle={cycle} compact />
                  {(showStartTrading || showJournal) && (
                    <div className="flex flex-wrap gap-2 pl-12">
                      {showStartTrading && (
                        <Button
                          size="sm"
                          disabled={isLoading}
                          className={pmPrimaryButtonClass}
                          onClick={() => onStartTrading(cycle.id)}
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
                </li>
              );
            })}
          </ul>
        ) : lifecycle === "draft" ? (
          <p className="mt-4 text-sm text-[var(--id-text-muted)]">
            Submit your pool for RyvonX review. Cycle 1 is created when approved.
          </p>
        ) : null}
      </div>
    </article>
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
        Create a strategy, then create a pool. After approval, open funding cycles inside that pool
        — never as separate pools.
      </p>
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
