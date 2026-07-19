"use client";

import { useState } from "react";
import { INVESTMENT_CYCLE_STATUS_LABELS } from "@/constants/investment-cycle";
import type { InvestmentCycle } from "@/domain/investment/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pmInputClass, pmPrimaryButtonClass } from "@/features/pool-manager/constants/ui";
import { PmFormField } from "@/features/pool-manager/components/workspace/pm-form-field";
import { PmSectionCard } from "@/features/pool-manager/components/workspace/pm-page-header";
import { PmFormMessage } from "@/features/pool-manager/components/workspace/pm-page-header";

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
      (lastCycle.maxCapacity != null &&
        lastCycle.raisedCapital >= lastCycle.maxCapacity));

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
    <PmSectionCard
      title="Investment Cycles"
      description="Each cycle inherits your pool configuration. Only set the cycle name and dates."
    >
      <div className="space-y-4">
        {cycles.length === 0 ? (
          <p className="text-sm text-[var(--id-text-muted)]">No cycles yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {cycles.map((cycle) => (
              <li key={cycle.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-[var(--id-text)]">
                    Cycle {cycle.cycleNumber}
                    {cycle.name !== poolName ? ` — ${cycle.name}` : ""}
                  </p>
                  <p className="text-[var(--id-text-muted)]">
                    {INVESTMENT_CYCLE_STATUS_LABELS[cycle.status] ?? cycle.status}
                    {cycle.openingDate &&
                      ` · Opens ${new Date(cycle.openingDate).toLocaleDateString()}`}
                    {cycle.closingDate &&
                      ` · Closes ${new Date(cycle.closingDate).toLocaleDateString()}`}
                  </p>
                </div>
                <span className="text-xs text-[var(--id-text-muted)]">Pool v{cycle.poolVersion}</span>
              </li>
            ))}
          </ul>
        )}

        {canCreate && (
          <div className="space-y-4 rounded-lg border border-dashed border-border p-4">
            <p className="text-sm font-medium text-[var(--id-text)]">Open next investment cycle</p>
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
              {loading ? "Creating…" : "Create Investment Cycle"}
            </Button>
          </div>
        )}

        {isLive && !canCreate && lastCycle && !["completed", "archived"].includes(lastCycle.status) && (
          <p className="text-sm text-[var(--id-text-muted)]">
            A new cycle can be opened when the current cycle is completed or reaches full capacity.
          </p>
        )}
      </div>
    </PmSectionCard>
  );
}
