"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROUTES } from "@/constants/routes";
import { MANAGED_POOL_STATUS_LABELS } from "@/domain/pools/managed-pool";
import type { Pool } from "@/domain/pools/types";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { pmLinkClass, pmPrimaryButtonClass, pmSecondaryButtonClass } from "@/features/pool-manager/constants/ui";
import { PmPageHeader, PmFormMessage } from "@/features/pool-manager/components/workspace/pm-page-header";

export function ManagedPoolListClient({ initialPools }: { initialPools: Pool[] }) {
  const router = useRouter();
  const [pools] = useState(initialPools);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitPool(poolId: string) {
    setLoading(true);
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
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <PmPageHeader
        hero
        eyebrow="Pool Management"
        title="My Pools"
        description="Create and manage your investment pools. Each pool includes your strategy, funding rules, and schedule."
        actions={
          <Button asChild className={pmPrimaryButtonClass}>
            <Link href={`${ROUTES.poolManagerPools}/new`}>Create New Pool</Link>
          </Button>
        }
      />
      <PmFormMessage message={error} variant="error" />

      <div className="space-y-4">
        {pools.length === 0 ? (
          <p className="text-sm text-[var(--id-text-muted)]">
            No pools yet. Click Create New Pool to get started.
          </p>
        ) : (
          pools.map((pool) => {
            const lifecycle = pool.lifecycleStatus ?? "draft";
            const label = MANAGED_POOL_STATUS_LABELS[lifecycle] ?? lifecycle;
            return (
              <div
                key={pool.id}
                className="rounded-2xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-5 shadow-[var(--id-shadow)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <Link href={`${ROUTES.poolManagerPools}/${pool.id}`} className="text-lg font-semibold text-[var(--id-text)] hover:text-[var(--pm-accent-text)]">
                      {pool.name}
                    </Link>
                    <p className="mt-1 text-sm text-[var(--id-text-secondary)]">{pool.description || "—"}</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--id-text-muted)]">
                      <span className="rounded-full bg-[var(--id-surface-hover)] px-2.5 py-1 capitalize">{label}</span>
                      <span>Min {formatCurrency(pool.minInvestment)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {lifecycle === "draft" && (
                      <>
                        <Button size="sm" variant="outline" className={pmSecondaryButtonClass} asChild>
                          <Link href={`${ROUTES.poolManagerPools}/${pool.id}`}>Edit</Link>
                        </Button>
                        <Button size="sm" disabled={loading} className={pmPrimaryButtonClass} onClick={() => void submitPool(pool.id)}>
                          Submit Pool
                        </Button>
                      </>
                    )}
                    {lifecycle === "live" && (
                      <Link href={`${ROUTES.marketplace}/${pool.slug}`} className={pmLinkClass}>
                        View in Marketplace
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
