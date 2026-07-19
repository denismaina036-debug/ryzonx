"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROUTES } from "@/constants/routes";
import { MANAGED_POOL_STATUS_LABELS } from "@/domain/pools/managed-pool";
import type { ManagedPoolFormInput } from "@/domain/pools/managed-pool";
import {
  normalizeManagedPoolForm,
  validateManagedPoolForm,
} from "@/domain/pools/managed-pool-validation";
import type { Pool } from "@/domain/pools/types";
import { Button } from "@/components/ui/button";
import { pmPrimaryButtonClass, pmSecondaryButtonClass } from "@/features/pool-manager/constants/ui";
import { PmPageHeader, PmFormMessage } from "@/features/pool-manager/components/workspace/pm-page-header";
import { ManagedPoolForm } from "./managed-pool-form";
import { ManagedPoolCyclesPanel } from "./managed-pool-cycles-panel";
import type { InvestmentCycle } from "@/domain/investment/types";

export function ManagedPoolEditClient({
  pool,
  initialValues,
  editable,
  approvedStrategies = [],
  cycles = [],
}: {
  pool: Pool;
  initialValues: ManagedPoolFormInput;
  editable: boolean;
  approvedStrategies?: { id: string; name: string }[];
  cycles?: InvestmentCycle[];
}) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [loading, setLoading] = useState<"draft" | "submit" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lifecycle = pool.lifecycleStatus ?? "draft";
  const statusLabel = MANAGED_POOL_STATUS_LABELS[lifecycle] ?? lifecycle;

  async function saveDraft() {
    const normalized = normalizeManagedPoolForm(values);
    const validationError = validateManagedPoolForm(normalized, { mode: "draft" });
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading("draft");
    setError(null);
    try {
      const res = await fetch(`/api/pool-manager/managed-pools/${pool.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalized),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(null);
    }
  }

  async function submitPool() {
    const normalized = normalizeManagedPoolForm(values);
    const validationError = validateManagedPoolForm(normalized, { mode: "submit" });
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading("submit");
    setError(null);
    try {
      const saveRes = await fetch(`/api/pool-manager/managed-pools/${pool.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalized),
      });
      const saveData = (await saveRes.json()) as { error?: string };
      if (!saveRes.ok) throw new Error(saveData.error ?? "Save failed");

      const res = await fetch(`/api/pool-manager/managed-pools/${pool.id}/submit`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Submit failed");
      router.push(ROUTES.poolManagerPools);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setLoading(null);
    }
  }

  const isBusy = loading != null;

  return (
    <div className="space-y-8">
      <PmPageHeader
        eyebrow="Pool Management"
        title={pool.name}
        description={`Status: ${statusLabel}`}
        actions={
          editable ? (
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={isBusy}
                className={pmPrimaryButtonClass}
                onClick={() => void saveDraft()}
              >
                {loading === "draft" ? "Saving…" : "Save Draft"}
              </Button>
              <Button
                disabled={isBusy}
                variant="outline"
                className={pmSecondaryButtonClass}
                onClick={() => void submitPool()}
              >
                {loading === "submit" ? "Submitting…" : "Submit Pool"}
              </Button>
            </div>
          ) : undefined
        }
      />
      {editable && <PmFormMessage message={error} variant="error" />}
      <ManagedPoolForm
        values={values}
        onChange={setValues}
        poolId={pool.id}
        editable={editable}
        approvedStrategies={approvedStrategies}
      />
      <ManagedPoolCyclesPanel
        poolId={pool.id}
        poolName={pool.name}
        lifecycleStatus={lifecycle}
        initialCycles={cycles}
      />
      {editable && <PmFormMessage message={error} variant="error" />}
      <Button variant="outline" className={pmSecondaryButtonClass} asChild>
        <Link href={ROUTES.poolManagerPools}>← Back to My Pools</Link>
      </Button>
    </div>
  );
}
