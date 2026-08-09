"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import type { InvestmentCycle } from "@/domain/investment/types";
import type { PlatformInvestmentLevel } from "@/domain/roi";
import { cn, formatCurrency } from "@/lib/utils";
import { isCycleFundingPhase, isCycleTradingPhase } from "@/lib/investment/cycle-display-phase";
import { PmSectionCard } from "@/features/pool-manager/components/workspace/pm-page-header";
import { PmStatusBadge } from "@/features/pool-manager/components/workspace/pm-status-badge";
import { PmFundingProgress } from "@/features/pool-manager/components/workspace/pm-funding-progress";
import { pmCardClass, pmStatLabelClass } from "@/features/pool-manager/constants/ui";
import { simplifyCycleStatus } from "@/features/pool-manager/utils/pm-status-presentation";
import {
  CreateCycleForm,
  buildCreateCyclePayload,
  validateCreateCycleForm,
  type CreateCycleFormValues,
} from "./create-cycle-form";
import type { RoiMultiplierEntry } from "./pm-roi-multiplier-editor";

function sortCyclesChronologically(cycles: InvestmentCycle[]): InvestmentCycle[] {
  return [...cycles].sort((a, b) => a.cycleNumber - b.cycleNumber);
}

function resolveCanCreateCycle(cycles: InvestmentCycle[], isLive: boolean): boolean {
  if (!isLive) return false;
  const lastCycle = [...cycles].sort((a, b) => b.cycleNumber - a.cycleNumber)[0];
  if (!lastCycle) return true;
  if (["completed", "archived"].includes(lastCycle.status)) return true;
  if (lastCycle.maxCapacity != null && lastCycle.raisedCapital >= lastCycle.maxCapacity) return true;
  return false;
}

export function ManagedPoolCyclesPanel({
  poolId,
  poolName,
  lifecycleStatus,
  initialCycles,
  investmentLevels = [],
}: {
  poolId: string;
  poolName: string;
  lifecycleStatus: string;
  initialCycles: InvestmentCycle[];
  investmentLevels?: PlatformInvestmentLevel[];
}) {
  const router = useRouter();
  const [cycles, setCycles] = useState(initialCycles);
  const [formValues, setFormValues] = useState<CreateCycleFormValues>({
    name: "",
    durationDays: "",
    minInvestment: "",
    targetCapital: "",
    targetInvestors: "",
    multipliers: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLive = lifecycleStatus === "live";
  const sortedCycles = useMemo(() => sortCyclesChronologically(cycles), [cycles]);
  const nextCycleNumber = (sortedCycles[sortedCycles.length - 1]?.cycleNumber ?? 0) + 1;
  const canCreate = resolveCanCreateCycle(cycles, isLive);
  const lastCycle = sortedCycles[sortedCycles.length - 1];

  useEffect(() => {
    setCycles(initialCycles);
  }, [initialCycles]);

  useEffect(() => {
    if (!canCreate || formValues.multipliers.length > 0) return;
    void fetch(`/api/pool-manager/managed-pools/${poolId}/roi`)
      .then((res) => res.json())
      .then((data: { multipliers?: RoiMultiplierEntry[] }) => {
        if (data.multipliers?.length) {
          setFormValues((prev) => ({ ...prev, multipliers: data.multipliers! }));
        }
      })
      .catch(() => undefined);
  }, [canCreate, formValues.multipliers.length, poolId]);

  async function createCycle() {
    const validationError = validateCreateCycleForm(formValues);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pool-manager/managed-pools/${poolId}/cycles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fundId: poolId,
          ...buildCreateCyclePayload(formValues),
        }),
      });
      const data = (await res.json()) as { error?: string; cycle?: InvestmentCycle };
      if (!res.ok) throw new Error(data.error ?? "Could not create cycle.");
      if (data.cycle) {
        setCycles((prev) => sortCyclesChronologically([...prev, data.cycle!]));
        setFormValues({
          name: "",
          durationDays: "",
          minInvestment: "",
          targetCapital: "",
          targetInvestors: "",
          multipliers: formValues.multipliers,
        });
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create cycle.");
    } finally {
      setLoading(false);
    }
  }

  if (!isLive && cycles.length === 0) {
    return (
      <PmSectionCard
        title="Cycles in this pool"
        description="Short-term funding rounds live inside your pool. Cycle 1 opens automatically when RyvonX approves your pool."
      >
        <p className="text-sm text-[var(--id-text-muted)]">
          Submit your pool for review first. You will manage cycles here once the pool is live.
        </p>
      </PmSectionCard>
    );
  }

  return (
    <div className="space-y-6">
      <PmSectionCard
        title="Cycles in this pool"
        description="Each cycle is a separate short-term funding round. Creating a cycle does not create a new pool."
      >
        {sortedCycles.length === 0 ? (
          <p className="text-sm text-[var(--id-text-muted)]">No cycles yet.</p>
        ) : (
          <ul className="space-y-3">
            {sortedCycles.map((cycle) => (
              <PoolCycleRow key={cycle.id} cycle={cycle} poolName={poolName} />
            ))}
          </ul>
        )}
      </PmSectionCard>

      {canCreate && (
        <PmSectionCard title={`Open cycle ${nextCycleNumber}`}>
          <CreateCycleForm
            poolId={poolId}
            poolName={poolName}
            cycleNumber={nextCycleNumber}
            investmentLevels={investmentLevels}
            values={formValues}
            onChange={setFormValues}
            onSubmit={createCycle}
            loading={loading}
            error={error}
          />
        </PmSectionCard>
      )}

      {isLive && !canCreate && lastCycle && !["completed", "archived"].includes(lastCycle.status) && (
        <p className="text-sm text-[var(--id-text-muted)]">
          Finish the current cycle (distribute profits and close it) before opening the next funding
          round.
        </p>
      )}
    </div>
  );
}

export function PoolCycleRow({
  cycle,
  poolName,
  compact = false,
}: {
  cycle: InvestmentCycle;
  poolName?: string;
  compact?: boolean;
}) {
  const detailHref = `${ROUTES.poolManagerInvestmentCycles}/${cycle.id}`;
  const target =
    cycle.targetCapital != null && cycle.targetCapital > 0
      ? cycle.targetCapital
      : null;
  const isFunding = isCycleFundingPhase(cycle.status);
  const isTrading = isCycleTradingPhase(cycle.status);
  const isCompleted = cycle.status === "completed" || cycle.status === "archived";

  return (
    <li>
      <div
        className={cn(
          pmCardClass,
          "overflow-hidden transition-colors hover:border-[var(--pm-accent-border)]",
          isCompleted && "opacity-90"
        )}
      >
        <Link
          href={detailHref}
          className={cn(
            "flex items-start gap-3 p-4 transition-colors hover:bg-[var(--id-surface-hover)]",
            compact && "p-3"
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--pm-accent-soft)] text-xs font-bold text-[var(--pm-accent-text)]">
            {cycle.cycleNumber}
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
            {poolName && !compact && (
              <p className="mt-0.5 text-xs text-[var(--id-text-faint)]">Inside {poolName}</p>
            )}
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
              <div>
                <dt className={pmStatLabelClass}>{isTrading ? "Capital traded" : "Raised"}</dt>
                <dd className="font-semibold tabular-nums text-[var(--id-text)]">
                  {formatCurrency(cycle.raisedCapital ?? 0)}
                </dd>
              </div>
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
          <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-[var(--id-text-faint)]" aria-hidden />
        </Link>
      </div>
    </li>
  );
}

export { resolveCanCreateCycle, sortCyclesChronologically };
