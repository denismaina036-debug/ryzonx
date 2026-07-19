"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { pmPrimaryButtonClass, pmSecondaryButtonClass } from "@/features/pool-manager/constants/ui";
import type { Strategy } from "@/domain/investment/types";
import { PmFormGuide } from "./pm-form-field";
import { PmPageHeader, PmSectionCard, PmFormMessage } from "./pm-page-header";
import {
  PmCycleForm,
  cycleToFormValues,
  formValuesToCyclePayload,
  validateCycleFormValues,
  type CycleFormValues,
} from "./pm-cycle-form";
import { createCycle } from "./pm-api";

export function PmCycleCreateClient({ strategies }: { strategies: Strategy[] }) {
  const router = useRouter();
  const [values, setValues] = useState<CycleFormValues>(cycleToFormValues());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!values.name.trim() || !values.strategyId) {
      setError("Cycle name and strategy are required.");
      return;
    }
    const capacityError = validateCycleFormValues(values);
    if (capacityError) {
      setError(capacityError);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const cycle = await createCycle(formValuesToCyclePayload(values));
      router.push(`${ROUTES.poolManagerInvestmentCycles}/${cycle.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleCreate} className="space-y-8">
      <PmPageHeader
        hero
        eyebrow="Investment Cycles"
        title="Create Investment Cycle"
        description="Draft a new cycle under an approved strategy. Submit for RyvonX review when ready."
      />
      <PmFormMessage message={error} variant="error" />
      {strategies.filter((s) => ["approved", "available", "operating", "paused"].includes(s.status)).length === 0 && (
        <PmFormMessage
          message="You need at least one approved strategy before creating a cycle."
          variant="info"
        />
      )}
      <PmFormGuide
        title="Before you create a cycle"
        items={[
          "Select an approved strategy — cycles always belong to one strategy.",
          "Capital fields are optional for drafts — you can fill them in later.",
          "If you set max capacity, it must be at least equal to target capital.",
          "Choose a funding deadline to define when commitments close.",
        ]}
      />
      <PmSectionCard
        title="Cycle Details"
        description="Define the fundraising window, capacity, and timeline for this cycle."
      >
        <PmCycleForm values={values} onChange={setValues} editable strategies={strategies} />
      </PmSectionCard>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={loading} className={pmPrimaryButtonClass}>
          {loading ? "Creating…" : "Create Draft"}
        </Button>
        <Button type="button" variant="outline" className={pmSecondaryButtonClass} asChild>
          <Link href={ROUTES.poolManagerInvestmentCycles}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
