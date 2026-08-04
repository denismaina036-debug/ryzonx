"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROUTES } from "@/constants/routes";
import type { InvestmentCycle } from "@/domain/investment/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pmInputClass, pmPrimaryButtonClass } from "@/features/pool-manager/constants/ui";
import { PmFormField } from "@/features/pool-manager/components/workspace/pm-form-field";
import { PmSectionCard } from "@/features/pool-manager/components/workspace/pm-page-header";
import { PmFormMessage } from "@/features/pool-manager/components/workspace/pm-page-header";
import { PmCycleListSections } from "@/features/pool-manager/components/workspace/pm-cycle-list-sections";

export function ManagedPoolCyclesPanel({
  poolId,
  poolName,
  lifecycleStatus,
  initialCycles,
}: {
  poolId: string;
  poolName: string;
  lifecycleStatus: string;
  initialCycles: InvestmentCycle[];
}) {
  const router = useRouter();
  const [cycles, setCycles] = useState(initialCycles);
  const [name, setName] = useState("");
  const [openingDate, setOpeningDate] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLive = lifecycleStatus === "live";
  const lastCycle = cycles[cycles.length - 1];
  const canCreate =
    isLive &&
    (!lastCycle ||
      ["completed", "archived"].includes(lastCycle.status) ||
      (lastCycle.maxCapacity != null && lastCycle.raisedCapital >= lastCycle.maxCapacity));

  async function createCycle() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pool-manager/managed-pools/${poolId}/cycles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          openingDate: openingDate || undefined,
          closingDate: closingDate || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string; cycle?: InvestmentCycle };
      if (!res.ok) throw new Error(data.error ?? "Could not create cycle.");
      if (data.cycle) {
        setCycles((prev) => [...prev, data.cycle!]);
        setName("");
        setOpeningDate("");
        setClosingDate("");
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
        title="Investment Cycles"
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
      <PmCycleListSections cycles={cycles} />

      {canCreate && (
        <PmSectionCard title="Add another cycle">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <PmFormField label="Cycle Name (optional)">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`${poolName} — Cycle ${(lastCycle?.cycleNumber ?? 0) + 1}`}
                  className={pmInputClass}
                />
              </PmFormField>
              <PmFormField label="Opening Date">
                <Input
                  type="date"
                  value={openingDate}
                  onChange={(e) => setOpeningDate(e.target.value)}
                  className={pmInputClass}
                />
              </PmFormField>
              <PmFormField label="Closing Date">
                <Input
                  type="date"
                  value={closingDate}
                  onChange={(e) => setClosingDate(e.target.value)}
                  className={pmInputClass}
                />
              </PmFormField>
            </div>
            <PmFormMessage message={error} variant="error" />
            <Button
              disabled={loading}
              className={pmPrimaryButtonClass}
              onClick={() => void createCycle()}
            >
              {loading ? "Creating…" : "Create Cycle"}
            </Button>
          </div>
        </PmSectionCard>
      )}

      {isLive && !canCreate && lastCycle && !["completed", "archived"].includes(lastCycle.status) && (
        <p className="text-sm text-[var(--id-text-muted)]">
          A new cycle can be added when the current cycle completes or reaches full capacity.
        </p>
      )}
    </div>
  );
}
