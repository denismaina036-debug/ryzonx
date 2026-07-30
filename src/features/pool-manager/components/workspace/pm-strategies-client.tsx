"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import type { Strategy } from "@/domain/investment/types";
import { PmPageHeader, PmSectionCard } from "./pm-page-header";
import { PmStatusBadge } from "./pm-status-badge";
import { pmPrimaryButtonClass, pmSecondaryButtonClass } from "@/features/pool-manager/constants/ui";
import {
  simplifyStrategyStatus,
  strategyBadgeStatus,
} from "@/features/pool-manager/utils/pm-status-presentation";
import { deleteStrategy } from "./pm-api";

export function PmStrategiesClient({ initialStrategies }: { initialStrategies: Strategy[] }) {
  const router = useRouter();
  const [strategies, setStrategies] = useState(initialStrategies);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = strategies.filter((s) => s.status !== "archived");

  async function handleDelete(strategy: Strategy) {
    const confirmed = window.confirm(
      `Delete "${strategy.name}"? This cannot be undone for draft strategies; others will be archived.`
    );
    if (!confirmed) return;

    setLoadingId(strategy.id);
    setError(null);
    try {
      await deleteStrategy(strategy.id);
      setStrategies((prev) => prev.filter((s) => s.id !== strategy.id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete strategy");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <PmPageHeader
        eyebrow="Step 1 — Strategy"
        title="My Strategies"
        description="Create and manage your trading strategies. Once approved, use one when creating a pool."
        actions={
          <Button asChild className={pmPrimaryButtonClass}>
            <Link href={`${ROUTES.poolManagerStrategies}/new`}>
              <Plus className="mr-2 h-4 w-4" />
              New Strategy
            </Link>
          </Button>
        }
      />

      {error && (
        <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-[var(--id-danger)]">{error}</p>
      )}

      <PmSectionCard title="My Strategies" description={`${visible.length} recorded strateg${visible.length === 1 ? "y" : "ies"}`}>
        {visible.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-[var(--id-text-muted)]">
              No strategies yet. Create your first strategy to begin.
            </p>
            <Button asChild className={`mt-4 ${pmPrimaryButtonClass}`}>
              <Link href={`${ROUTES.poolManagerStrategies}/new`}>Create Strategy</Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--id-border)]">
            {visible.map((strategy) => {
              const simplified = simplifyStrategyStatus(strategy.status);
              const badgeStatus = strategyBadgeStatus(strategy.status);
              const isLoading = loadingId === strategy.id;

              return (
                <li
                  key={strategy.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`${ROUTES.poolManagerStrategies}/${strategy.id}`}
                      className="font-semibold text-[var(--id-text)] hover:text-[var(--pm-accent-text)]"
                    >
                      {strategy.name}
                    </Link>
                    {strategy.investmentStyle && (
                      <p className="mt-0.5 text-xs text-[var(--id-text-muted)]">
                        {strategy.investmentStyle}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <PmStatusBadge label={simplified} status={badgeStatus} />
                    <Button size="sm" variant="outline" className={pmSecondaryButtonClass} asChild>
                      <Link href={`${ROUTES.poolManagerStrategies}/${strategy.id}`}>
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        Edit
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={pmSecondaryButtonClass}
                      disabled={isLoading}
                      onClick={() => void handleDelete(strategy)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </PmSectionCard>
    </div>
  );
}
