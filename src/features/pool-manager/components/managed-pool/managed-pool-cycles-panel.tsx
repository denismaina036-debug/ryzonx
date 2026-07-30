"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookOpen, Play } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import {
  simplifyCycleStatus,
} from "@/features/pool-manager/utils/pm-status-presentation";
import type { InvestmentCycle } from "@/domain/investment/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { pmInputClass, pmPrimaryButtonClass, pmSecondaryButtonClass } from "@/features/pool-manager/constants/ui";
import { PmFormField } from "@/features/pool-manager/components/workspace/pm-form-field";
import { PmSectionCard } from "@/features/pool-manager/components/workspace/pm-page-header";
import { PmFormMessage } from "@/features/pool-manager/components/workspace/pm-page-header";
import { PmStatusBadge } from "@/features/pool-manager/components/workspace/pm-status-badge";
import { transitionCycle } from "@/features/pool-manager/components/workspace/pm-api";
import {
  canOpenJournal,
  canStartTrading,
} from "@/features/pool-manager/utils/pool-cycle-presentation";

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
  const [loadingCycleId, setLoadingCycleId] = useState<string | null>(null);
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

  async function startTrading(cycleId: string) {
    setLoadingCycleId(cycleId);
    setError(null);
    try {
      await transitionCycle(cycleId, "trading");
      router.push(`${ROUTES.poolManagerInvestmentCycles}/${cycleId}/journal`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start trading");
      setLoadingCycleId(null);
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
      description="Each cycle inherits your pool settings. Start trading to open the journal and record trades."
    >
      <div className="space-y-4">
        {cycles.length === 0 ? (
          <p className="text-sm text-[var(--id-text-muted)]">No cycles yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--id-border)] rounded-lg border border-[var(--id-border)]">
            {cycles.map((cycle) => (
              <li
                key={cycle.id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-[var(--id-text)]">
                      Cycle {cycle.cycleNumber}
                      {cycle.name !== poolName ? ` — ${cycle.name}` : ""}
                    </p>
                    <PmStatusBadge
                      label={simplifyCycleStatus(cycle.status)}
                      status={cycle.status}
                    />
                  </div>
                  <p className="mt-1 text-sm text-[var(--id-text-muted)]">
                    {formatCurrency(cycle.raisedCapital ?? 0)} raised · {cycle.investorCount ?? 0}{" "}
                    investors
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {canStartTrading(cycle) && (
                    <Button
                      size="sm"
                      disabled={loadingCycleId === cycle.id}
                      className={pmPrimaryButtonClass}
                      onClick={() => void startTrading(cycle.id)}
                    >
                      <Play className="mr-1.5 h-3.5 w-3.5" />
                      Start Trading
                    </Button>
                  )}
                  {canOpenJournal(cycle) && (
                    <Button size="sm" className={pmPrimaryButtonClass} asChild>
                      <Link href={`${ROUTES.poolManagerInvestmentCycles}/${cycle.id}/journal`}>
                        <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                        Open Journal
                      </Link>
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className={pmSecondaryButtonClass} asChild>
                    <Link href={`${ROUTES.poolManagerInvestmentCycles}/${cycle.id}`}>Details</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {canCreate && (
          <div className="space-y-4 rounded-lg border border-dashed border-[var(--id-border)] p-4">
            <p className="text-sm font-medium text-[var(--id-text)]">Add another cycle</p>
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
        )}

        {isLive && !canCreate && lastCycle && !["completed", "archived"].includes(lastCycle.status) && (
          <p className="text-sm text-[var(--id-text-muted)]">
            A new cycle can be added when the current cycle completes or reaches full capacity.
          </p>
        )}
      </div>
    </PmSectionCard>
  );
}
