"use client";



import Link from "next/link";

import { useRouter } from "next/navigation";

import { useState } from "react";

import { ROUTES } from "@/constants/routes";

import { Button } from "@/components/ui/button";

import { pmPrimaryButtonClass, pmSecondaryButtonClass } from "@/features/pool-manager/constants/ui";

import { PmFormGuide } from "./pm-form-field";

import { PmPageHeader, PmSectionCard, PmFormMessage } from "./pm-page-header";

import {

  PmStrategyForm,

  formValuesToPayload,

  strategyToFormValues,

  type StrategyFormValues,

} from "./pm-strategy-form";

import { createStrategy } from "./pm-api";



export function PmStrategyCreateClient() {

  const router = useRouter();

  const [values, setValues] = useState<StrategyFormValues>(strategyToFormValues());

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);



  async function handleCreate(e: React.FormEvent) {

    e.preventDefault();

    if (!values.name.trim()) {

      setError("Strategy name is required.");

      return;

    }

    setLoading(true);

    setError(null);

    try {

      const strategy = await createStrategy(formValuesToPayload(values));

      router.push(`${ROUTES.poolManagerStrategies}/${strategy.id}`);

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

        eyebrow="Strategy Management"

        title="Create Strategy"

        description="Define your investment methodology as a draft. Submit for RyvonX review when every section is complete."

      />

      <PmFormMessage message={error} variant="error" />

      <PmFormGuide

        title="How to complete this form"

        items={[

          "Start with a clear strategy name — this is what investors see first.",

          "Fill in description and objectives so reviewers understand your edge.",

          "Set risk profile and supported assets to help investors self-select.",

          "Save as draft anytime; you can edit before submitting for approval.",

        ]}

      />

      <PmSectionCard

        title="Strategy Details"

        description="All fields help RyvonX reviewers and future investors understand your approach."

      >

        <PmStrategyForm values={values} onChange={setValues} editable />

      </PmSectionCard>

      <div className="flex flex-wrap gap-3">

        <Button type="submit" disabled={loading} className={pmPrimaryButtonClass}>

          {loading ? "Creating…" : "Create Draft"}

        </Button>

        <Button type="button" variant="outline" className={pmSecondaryButtonClass} asChild>

          <Link href={ROUTES.poolManagerStrategies}>Cancel</Link>

        </Button>

      </div>

    </form>

  );

}


