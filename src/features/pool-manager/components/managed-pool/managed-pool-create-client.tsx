"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { emptyManagedPoolForm } from "@/domain/pools/managed-pool";
import {
  normalizeManagedPoolForm,
  validateManagedPoolForm,
} from "@/domain/pools/managed-pool-validation";
import { pmPrimaryButtonClass, pmSecondaryButtonClass } from "@/features/pool-manager/constants/ui";
import { PmFormGuide } from "@/features/pool-manager/components/workspace/pm-form-field";
import { PmPageHeader, PmFormMessage } from "@/features/pool-manager/components/workspace/pm-page-header";
import { ManagedPoolForm } from "./managed-pool-form";

export function ManagedPoolCreateClient({
  approvedStrategies,
  defaultStrategyId,
}: {
  approvedStrategies: { id: string; name: string }[];
  defaultStrategyId?: string | null;
}) {
  const router = useRouter();
  const [values, setValues] = useState(() => {
    const form = emptyManagedPoolForm();
    if (defaultStrategyId) form.strategyId = defaultStrategyId;
    return form;
  });
  const [loading, setLoading] = useState<"draft" | "submit" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent, submitForReview: boolean) {
    e.preventDefault();
    const normalized = normalizeManagedPoolForm(values);
    const validationError = validateManagedPoolForm(normalized, {
      mode: submitForReview ? "submit" : "draft",
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(submitForReview ? "submit" : "draft");
    setError(null);
    try {
      const res = await fetch("/api/pool-manager/managed-pools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...normalized, submitForReview }),
      });
      const data = (await res.json()) as { error?: string; pool?: { id: string } };
      if (!res.ok) throw new Error(data.error ?? "Create failed");
      if (!data.pool?.id) throw new Error("Create failed");
      router.push(`${ROUTES.poolManagerPools}/${data.pool.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setLoading(null);
    }
  }

  const isBusy = loading != null;

  return (
    <form className="space-y-8">
      <PmPageHeader
        hero
        eyebrow="Pool Management"
        title="Create New Pool"
        description="Configure your pool using an approved strategy. Administrators review submitted pools before they go live."
      />
      <PmFormGuide
        title="Before you submit"
        items={[
          "Select an approved strategy — create strategies separately under Strategies.",
          "Complete pool info, trading session, investment rules, schedule, and risk.",
          "Once approved, your pool goes live in the Marketplace automatically.",
        ]}
      />
      <ManagedPoolForm
        values={values}
        onChange={setValues}
        approvedStrategies={approvedStrategies}
      />
      <div className="space-y-3">
        <PmFormMessage message={error} variant="error" />
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            disabled={isBusy}
            className={pmPrimaryButtonClass}
            onClick={(e) => void handleSubmit(e, false)}
          >
            {loading === "draft" ? "Saving…" : "Save Draft"}
          </Button>
          <Button
            type="button"
            disabled={isBusy}
            variant="outline"
            className={pmSecondaryButtonClass}
            onClick={(e) => void handleSubmit(e, true)}
          >
            {loading === "submit" ? "Submitting…" : "Submit Pool"}
          </Button>
          <Button type="button" variant="outline" className={pmSecondaryButtonClass} asChild>
            <Link href={ROUTES.poolManagerPools}>Cancel</Link>
          </Button>
        </div>
      </div>
    </form>
  );
}
