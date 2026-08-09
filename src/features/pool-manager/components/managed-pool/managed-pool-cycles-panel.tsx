"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { InvestmentCycle } from "@/domain/investment/types";
import type { PlatformInvestmentLevel } from "@/domain/roi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pmInputClass, pmPrimaryButtonClass } from "@/features/pool-manager/constants/ui";
import { PmFormField } from "@/features/pool-manager/components/workspace/pm-form-field";
import { PmSectionCard } from "@/features/pool-manager/components/workspace/pm-page-header";
import { PmFormMessage } from "@/features/pool-manager/components/workspace/pm-page-header";
import { PmCycleListSections } from "@/features/pool-manager/components/workspace/pm-cycle-list-sections";
import {
  PmRoiMultiplierEditor,
  type RoiMultiplierEntry,
} from "@/features/pool-manager/components/managed-pool/pm-roi-multiplier-editor";
import {
  parseCycleAmount,
  parseCycleMinInvestment,
  validateCycleCapacityFields,
} from "@/domain/investment/cycle-validation";

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
  const [name, setName] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [minInvestment, setMinInvestment] = useState("");
  const [targetCapital, setTargetCapital] = useState("");
  const [targetInvestors, setTargetInvestors] = useState("");
  const [multipliers, setMultipliers] = useState<RoiMultiplierEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLive = lifecycleStatus === "live";
  const lastCycle = cycles[cycles.length - 1];
  const nextCycleNumber = (lastCycle?.cycleNumber ?? 0) + 1;
  const canCreate =
    isLive &&
    (!lastCycle ||
      ["completed", "archived"].includes(lastCycle.status) ||
      (lastCycle.maxCapacity != null && lastCycle.raisedCapital >= lastCycle.maxCapacity));

  useEffect(() => {
    if (!canCreate || multipliers.length > 0) return;
    void fetch(`/api/pool-manager/managed-pools/${poolId}/roi`)
      .then((res) => res.json())
      .then((data: { multipliers?: RoiMultiplierEntry[] }) => {
        if (data.multipliers?.length) setMultipliers(data.multipliers);
      })
      .catch(() => undefined);
  }, [canCreate, multipliers.length, poolId]);

  async function createCycle() {
    const parsed = {
      targetCapital: parseCycleAmount(targetCapital),
      minInvestment: parseCycleMinInvestment(minInvestment),
      durationDays: parseCycleAmount(durationDays),
    };
    const validationError = validateCycleCapacityFields(parsed);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!name.trim()) {
      setError("Cycle name is required.");
      return;
    }
    const investors = parseCycleAmount(targetInvestors);
    if (!investors || investors <= 0) {
      setError("Target investors must be greater than zero.");
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
          name: name.trim(),
          durationDays: parsed.durationDays,
          minInvestment: parsed.minInvestment,
          targetCapital: parsed.targetCapital,
          targetInvestors: investors,
          maxCapacity: parsed.targetCapital,
          roiMultipliers: multipliers
            .filter((entry) => entry.multiplier.trim())
            .map((entry) => ({
              investmentLevelId: entry.investmentLevelId,
              multiplier: Number(entry.multiplier),
            })),
        }),
      });
      const data = (await res.json()) as { error?: string; cycle?: InvestmentCycle };
      if (!res.ok) throw new Error(data.error ?? "Could not create cycle.");
      if (data.cycle) {
        setCycles((prev) => [...prev, data.cycle!]);
        setName("");
        setDurationDays("");
        setMinInvestment("");
        setTargetCapital("");
        setTargetInvestors("");
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
        title="Investment cycles"
        description="Cycle 1 is created automatically when your pool is approved and goes live."
      >
        <p className="text-sm text-[var(--id-text-muted)]">
          Submit your pool for review to begin the approval process.
        </p>
      </PmSectionCard>
    );
  }

  return (
    <div className="space-y-6">
      <PmSectionCard
        title="Investment cycles"
        description="The pool holds your strategy and branding. Each cycle is a separate short-term funding round with its own capital target, investors, and profit settlement."
      >
        <PmCycleListSections cycles={cycles} />
      </PmSectionCard>

      {canCreate && (
        <PmSectionCard title={`Open cycle ${nextCycleNumber}`}>
          <p className="mb-4 text-sm text-[var(--id-text-muted)]">
            Set only the terms for this cycle. Pool branding, strategy, markets, and schedule stay
            inherited from the parent pool.
          </p>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <PmFormField label="Cycle name" required>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`${poolName} — Cycle ${nextCycleNumber}`}
                  className={pmInputClass}
                />
              </PmFormField>
              <PmFormField label="Trading duration (days)" required>
                <Input
                  type="number"
                  min={1}
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  className={pmInputClass}
                />
              </PmFormField>
              <PmFormField label="Minimum investment (USD)" required>
                <Input
                  type="number"
                  min={1}
                  value={minInvestment}
                  onChange={(e) => setMinInvestment(e.target.value)}
                  className={pmInputClass}
                />
              </PmFormField>
              <PmFormField label="Target capital (USD)" required>
                <Input
                  type="number"
                  min={1}
                  value={targetCapital}
                  onChange={(e) => setTargetCapital(e.target.value)}
                  className={pmInputClass}
                />
              </PmFormField>
              <PmFormField label="Target investors" required>
                <Input
                  type="number"
                  min={1}
                  value={targetInvestors}
                  onChange={(e) => setTargetInvestors(e.target.value)}
                  className={pmInputClass}
                />
              </PmFormField>
            </div>

            {investmentLevels.length > 0 && (
              <PmRoiMultiplierEditor
                levels={investmentLevels}
                multipliers={multipliers}
                onChange={setMultipliers}
              />
            )}

            <PmFormMessage message={error} variant="error" />
            <Button
              disabled={loading}
              className={pmPrimaryButtonClass}
              onClick={() => void createCycle()}
            >
              {loading ? "Creating…" : "Create funding cycle"}
            </Button>
          </div>
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
