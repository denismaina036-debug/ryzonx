"use client";



import { useCallback, useState } from "react";

import { Input } from "@/components/ui/input";

import { Textarea } from "@/components/ui/textarea";

import {

  Select,

  SelectContent,

  SelectItem,

  SelectTrigger,

  SelectValue,

} from "@/components/ui/select";

import {

  STRATEGY_RISK_PROFILES,

  STRATEGY_VISIBILITY,

} from "@/constants/strategy";

import type { StrategyRiskProfile, StrategyVisibility } from "@/constants/strategy";

import type { Strategy } from "@/domain/investment/types";

import {

  pmInputClass,

  pmSelectContentClass,

  pmSelectItemClass,

  pmSelectTriggerClass,

  pmTextareaClass,

} from "@/features/pool-manager/constants/ui";

import { PmFormField } from "./pm-form-field";

import { PmFormMessage } from "./pm-page-header";

import { usePmAutosave } from "@/features/pool-manager/hooks/use-pm-autosave";

import { updateStrategy } from "./pm-api";



export interface StrategyFormValues {

  name: string;

  description: string;

  objectives: string;

  riskProfile: StrategyRiskProfile | "";

  investmentStyle: string;

  supportedAssets: string;

  visibility: StrategyVisibility;

}



export function strategyToFormValues(strategy?: Strategy): StrategyFormValues {

  return {

    name: strategy?.name ?? "",

    description: strategy?.description ?? "",

    objectives: strategy?.objectives ?? "",

    riskProfile: strategy?.riskProfile ?? "",

    investmentStyle: strategy?.investmentStyle ?? "",

    supportedAssets: strategy?.supportedAssets?.join(", ") ?? "",

    visibility: strategy?.visibility ?? "private",

  };

}



export function formValuesToPayload(values: StrategyFormValues) {

  return {

    name: values.name,

    description: values.description || undefined,

    objectives: values.objectives || undefined,

    riskProfile: values.riskProfile || undefined,

    investmentStyle: values.investmentStyle || undefined,

    supportedAssets: values.supportedAssets

      .split(",")

      .map((s) => s.trim())

      .filter(Boolean),

    visibility: values.visibility,

  };

}



export function PmStrategyForm({

  strategyId,

  values,

  onChange,

  editable,

  onAutosaved,

}: {

  strategyId?: string;

  values: StrategyFormValues;

  onChange: (values: StrategyFormValues) => void;

  editable: boolean;

  onAutosaved?: (strategy: Strategy) => void;

}) {

  const [autosaveNote, setAutosaveNote] = useState<string | null>(null);



  const saveDraft = useCallback(

    async (next: StrategyFormValues) => {

      if (!strategyId || !editable) return;

      try {

        const strategy = await updateStrategy(strategyId, formValuesToPayload(next));

        setAutosaveNote("Draft saved");

        onAutosaved?.(strategy);

      } catch {

        setAutosaveNote("Autosave failed");

      }

    },

    [strategyId, editable, onAutosaved]

  );



  usePmAutosave(values, saveDraft, Boolean(strategyId && editable));



  function patch<K extends keyof StrategyFormValues>(key: K, value: StrategyFormValues[K]) {

    onChange({ ...values, [key]: value });

    setAutosaveNote(null);

  }



  return (

    <div className="space-y-6">

      {autosaveNote && <PmFormMessage message={autosaveNote} variant="success" />}



      <PmFormField

        label="Strategy Name"

        hint="A clear, professional name that investors will see in the marketplace."

        required

      >

        <Input

          value={values.name}

          onChange={(e) => patch("name", e.target.value)}

          disabled={!editable}

          required

          placeholder="e.g. Global Macro Alpha"

          className={pmInputClass}

        />

      </PmFormField>



      <PmFormField

        label="Description"

        hint="Summarize your approach, time horizon, and what makes this strategy distinct."

      >

        <Textarea

          value={values.description}

          onChange={(e) => patch("description", e.target.value)}

          disabled={!editable}

          rows={4}

          placeholder="Describe how you generate returns, manage risk, and operate under RyvonX governance…"

          className={pmTextareaClass}

        />

      </PmFormField>



      <PmFormField

        label="Objectives"

        hint="State the measurable outcomes or investor goals this strategy targets."

      >

        <Textarea

          value={values.objectives}

          onChange={(e) => patch("objectives", e.target.value)}

          disabled={!editable}

          rows={3}

          placeholder="What this strategy aims to achieve…"

          className={pmTextareaClass}

        />

      </PmFormField>



      <div className="grid gap-6 sm:grid-cols-2">

        <PmFormField

          label="Risk Profile"

          hint="How much volatility and drawdown investors should expect."

        >

          <Select

            value={values.riskProfile || "none"}

            onValueChange={(v) =>

              patch("riskProfile", v === "none" ? "" : (v as StrategyRiskProfile))

            }

            disabled={!editable}

          >

            <SelectTrigger className={pmSelectTriggerClass}>

              <SelectValue placeholder="Select risk profile" />

            </SelectTrigger>

            <SelectContent className={pmSelectContentClass}>

              <SelectItem value="none" className={pmSelectItemClass}>

                Not set

              </SelectItem>

              {STRATEGY_RISK_PROFILES.map((r) => (

                <SelectItem key={r} value={r} className={cnCapitalize(pmSelectItemClass)}>

                  {r}

                </SelectItem>

              ))}

            </SelectContent>

          </Select>

        </PmFormField>



        <PmFormField

          label="Visibility"

          hint="Private strategies stay hidden until you submit for RyvonX review."

        >

          <Select

            value={values.visibility}

            onValueChange={(v) => patch("visibility", v as StrategyVisibility)}

            disabled={!editable}

          >

            <SelectTrigger className={pmSelectTriggerClass}>

              <SelectValue />

            </SelectTrigger>

            <SelectContent className={pmSelectContentClass}>

              {STRATEGY_VISIBILITY.map((v) => (

                <SelectItem key={v} value={v} className={cnCapitalize(pmSelectItemClass)}>

                  {v}

                </SelectItem>

              ))}

            </SelectContent>

          </Select>

        </PmFormField>

      </div>



      <PmFormField

        label="Investment Style"

        hint="The trading or allocation style that defines how you execute."

      >

        <Input

          value={values.investmentStyle}

          onChange={(e) => patch("investmentStyle", e.target.value)}

          disabled={!editable}

          placeholder="e.g. Swing, Momentum, Income"

          className={pmInputClass}

        />

      </PmFormField>



      <PmFormField

        label="Supported Assets"

        hint="Comma-separated symbols or markets this strategy trades (e.g. EUR/USD, BTC/USD)."

      >

        <Input

          value={values.supportedAssets}

          onChange={(e) => patch("supportedAssets", e.target.value)}

          disabled={!editable}

          placeholder="EUR/USD, BTC/USD, XAU/USD"

          className={pmInputClass}

        />

      </PmFormField>

    </div>

  );

}



function cnCapitalize(base: string) {

  return `${base} capitalize`;

}


