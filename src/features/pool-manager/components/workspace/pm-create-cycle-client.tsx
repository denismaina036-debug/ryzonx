"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ROUTES } from "@/constants/routes";
import type { Pool } from "@/domain/pools/types";
import type { InvestmentCycle } from "@/domain/investment/types";
import type { PlatformInvestmentLevel } from "@/domain/roi";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  pmPrimaryButtonClass,
  pmSecondaryButtonClass,
  pmSelectContentClass,
  pmSelectItemClass,
  pmSelectTriggerClass,
} from "@/features/pool-manager/constants/ui";
import { PmPageHeader, PmFormMessage } from "./pm-page-header";
import {
  CreateCycleForm,
  buildCreateCyclePayload,
  validateCreateCycleForm,
  type CreateCycleFormValues,
} from "@/features/pool-manager/components/managed-pool/create-cycle-form";
import {
  resolveCanCreateCycle,
  sortCyclesChronologically,
} from "@/features/pool-manager/components/managed-pool/pool-cycles-section";
import type { RoiMultiplierEntry } from "@/features/pool-manager/components/managed-pool/pm-roi-multiplier-editor";

export interface PoolCycleOption {
  pool: Pool;
  cycles: InvestmentCycle[];
}

export function PmCreateCycleClient({
  pools,
  investmentLevels,
  initialPoolId,
}: {
  pools: PoolCycleOption[];
  investmentLevels: PlatformInvestmentLevel[];
  initialPoolId?: string | null;
}) {
  const router = useRouter();
  const livePools = pools.filter((entry) => entry.pool.lifecycleStatus === "live");

  const defaultPoolId = useMemo(() => {
    if (initialPoolId && livePools.some((entry) => entry.pool.id === initialPoolId)) {
      return initialPoolId;
    }
    return livePools[0]?.pool.id ?? "";
  }, [initialPoolId, livePools]);

  const [poolId, setPoolId] = useState(defaultPoolId);
  const selected = livePools.find((entry) => entry.pool.id === poolId) ?? livePools[0] ?? null;
  const sortedCycles = useMemo(
    () => sortCyclesChronologically(selected?.cycles ?? []),
    [selected?.cycles]
  );
  const nextCycleNumber = (sortedCycles[sortedCycles.length - 1]?.cycleNumber ?? 0) + 1;
  const canCreate = selected ? resolveCanCreateCycle(selected.cycles, true) : false;

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

  useEffect(() => {
    setPoolId(defaultPoolId);
  }, [defaultPoolId]);

  useEffect(() => {
    if (!poolId || formValues.multipliers.length > 0) return;
    void fetch(`/api/pool-manager/managed-pools/${poolId}/roi`)
      .then((res) => res.json())
      .then((data: { multipliers?: RoiMultiplierEntry[] }) => {
        if (data.multipliers?.length) {
          setFormValues((prev) => ({ ...prev, multipliers: data.multipliers! }));
        }
      })
      .catch(() => undefined);
  }, [poolId, formValues.multipliers.length]);

  async function createCycle() {
    if (!selected) return;

    const validationError = validateCreateCycleForm(formValues);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pool-manager/managed-pools/${selected.pool.id}/cycles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fundId: selected.pool.id,
          ...buildCreateCyclePayload(formValues),
        }),
      });
      const data = (await res.json()) as { error?: string; cycle?: InvestmentCycle };
      if (!res.ok) throw new Error(data.error ?? "Could not create cycle.");

      if (data.cycle?.id) {
        router.push(`${ROUTES.poolManagerInvestmentCycles}/${data.cycle.id}`);
      } else {
        router.push(ROUTES.poolManagerInvestmentCycles);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create cycle.");
    } finally {
      setLoading(false);
    }
  }

  if (livePools.length === 0) {
    return (
      <div className="space-y-6">
        <PmPageHeader
          eyebrow="Investment Cycles"
          title="Open a new cycle"
          description="Cycles are created inside an existing live pool — never as a new pool."
        />
        <div className="rounded-2xl border border-dashed border-[var(--id-border)] bg-[var(--id-surface)] px-6 py-10 text-center">
          <p className="text-sm font-medium text-[var(--id-text)]">No live pools yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--id-text-muted)]">
            Approve and go live with a pool first. Then open Cycle 1, Cycle 2, and so on inside
            that pool.
          </p>
          <Button asChild className={`mt-6 ${pmPrimaryButtonClass}`}>
            <Link href={ROUTES.poolManager}>Go to My Pools</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PmPageHeader
        eyebrow="Investment Cycles"
        title={`Open cycle ${nextCycleNumber}`}
        description="Create a short-term funding round inside an existing pool. Pool branding and strategy stay the same."
        actions={
          <Button asChild variant="outline" className={pmSecondaryButtonClass}>
            <Link href={ROUTES.poolManagerInvestmentCycles}>← All cycles</Link>
          </Button>
        }
      />

      <div className="rounded-2xl border border-[var(--id-border)] bg-[var(--id-surface)] p-5 sm:p-6">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">
          Parent pool
        </label>
        {livePools.length === 1 ? (
          <p className="text-base font-semibold text-[var(--id-text)]">{selected!.pool.name}</p>
        ) : (
          <Select value={poolId} onValueChange={setPoolId}>
            <SelectTrigger className={pmSelectTriggerClass}>
              <SelectValue placeholder="Select pool" />
            </SelectTrigger>
            <SelectContent className={pmSelectContentClass}>
              {livePools.map(({ pool }) => (
                <SelectItem key={pool.id} value={pool.id} className={pmSelectItemClass}>
                  {pool.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <p className="mt-2 text-sm text-[var(--id-text-muted)]">
          This opens a new cycle inside the pool — it does not create a new pool.
        </p>
      </div>

      {!canCreate && selected && (
        <PmFormMessage
          message="Finish the current cycle in this pool (distribute profits and close it) before opening the next funding round."
          variant="error"
        />
      )}

      {canCreate && selected && (
        <div className="rounded-2xl border border-[var(--id-border)] bg-[var(--id-surface)] p-5 sm:p-6">
          <CreateCycleForm
            poolId={selected.pool.id}
            poolName={selected.pool.name}
            cycleNumber={nextCycleNumber}
            investmentLevels={investmentLevels}
            values={formValues}
            onChange={setFormValues}
            onSubmit={createCycle}
            loading={loading}
            error={error}
            submitLabel={`Create cycle ${nextCycleNumber}`}
          />
        </div>
      )}

      <Button asChild variant="outline" className={pmSecondaryButtonClass}>
        <Link href={`${ROUTES.poolManagerPools}/${selected?.pool.id}`}>
          Manage pool & cycles
        </Link>
      </Button>
    </div>
  );
}
