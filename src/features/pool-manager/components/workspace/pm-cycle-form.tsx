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
import type { InvestmentCycle, Strategy } from "@/domain/investment/types";
import {
  parseCycleAmount,
  parseCycleMaxCapacity,
  parseCycleMinInvestment,
  validateCycleCapacityFields,
} from "@/domain/investment/cycle-validation";
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
import { updateCycle } from "./pm-api";

export interface CycleFormValues {
  strategyId: string;
  name: string;
  description: string;
  targetCapital: string;
  minInvestment: string;
  maxCapacity: string;
  fundingDeadline: string;
  durationDays: string;
}

export function cycleToFormValues(cycle?: InvestmentCycle, strategyId = ""): CycleFormValues {
  return {
    strategyId: cycle?.strategyId ?? strategyId,
    name: cycle?.name ?? "",
    description: cycle?.description ?? "",
    targetCapital: cycle?.targetCapital != null ? String(cycle.targetCapital) : "",
    minInvestment: cycle?.minInvestment != null ? String(cycle.minInvestment) : "",
    maxCapacity: cycle?.maxCapacity != null ? String(cycle.maxCapacity) : "",
    fundingDeadline: cycle?.fundingDeadline ? cycle.fundingDeadline.slice(0, 16) : "",
    durationDays: cycle?.durationDays != null ? String(cycle.durationDays) : "",
  };
}

export function cycleCapacityFromForm(values: CycleFormValues) {
  return {
    targetCapital: parseCycleAmount(values.targetCapital),
    minInvestment: parseCycleMinInvestment(values.minInvestment),
    maxCapacity: parseCycleMaxCapacity(values.maxCapacity),
    durationDays: parseCycleAmount(values.durationDays),
  };
}

export function validateCycleFormValues(values: CycleFormValues): string | null {
  return validateCycleCapacityFields(cycleCapacityFromForm(values));
}

export function formValuesToCyclePayload(values: CycleFormValues) {
  const capacity = cycleCapacityFromForm(values);
  return {
    strategyId: values.strategyId,
    name: values.name,
    description: values.description || undefined,
    targetCapital: capacity.targetCapital,
    minInvestment: capacity.minInvestment,
    maxCapacity: capacity.maxCapacity,
    fundingDeadline: values.fundingDeadline
      ? new Date(values.fundingDeadline).toISOString()
      : undefined,
    durationDays: capacity.durationDays,
  };
}

export function PmCycleForm({
  cycleId,
  values,
  onChange,
  editable,
  strategies,
  onAutosaved,
}: {
  cycleId?: string;
  values: CycleFormValues;
  onChange: (values: CycleFormValues) => void;
  editable: boolean;
  strategies: Strategy[];
  onAutosaved?: (cycle: InvestmentCycle) => void;
}) {
  const [autosaveNote, setAutosaveNote] = useState<string | null>(null);

  const approvedStrategies = strategies.filter((s) =>
    ["approved", "available", "operating", "paused"].includes(s.status)
  );

  const saveDraft = useCallback(
    async (next: CycleFormValues) => {
      if (!cycleId || !editable) return;
      const capacityError = validateCycleFormValues(next);
      if (capacityError) {
        setAutosaveNote(capacityError);
        return;
      }
      const { strategyId: _s, ...rest } = formValuesToCyclePayload(next);
      try {
        const cycle = await updateCycle(cycleId, rest);
        setAutosaveNote("Draft saved");
        onAutosaved?.(cycle);
      } catch {
        setAutosaveNote("Autosave failed");
      }
    },
    [cycleId, editable, onAutosaved]
  );

  usePmAutosave(values, saveDraft, Boolean(cycleId && editable));

  function patch<K extends keyof CycleFormValues>(key: K, value: CycleFormValues[K]) {
    onChange({ ...values, [key]: value });
    setAutosaveNote(null);
  }

  return (
    <div className="space-y-6">
      {autosaveNote && (
        <PmFormMessage
          message={autosaveNote}
          variant={autosaveNote === "Draft saved" ? "success" : "error"}
        />
      )}

      <PmFormField
        label="Strategy"
        hint="Choose an approved strategy this cycle will operate under."
        required
      >
        <Select
          value={values.strategyId || "none"}
          onValueChange={(v) => patch("strategyId", v === "none" ? "" : v)}
          disabled={!editable || Boolean(cycleId)}
        >
          <SelectTrigger className={pmSelectTriggerClass}>
            <SelectValue placeholder="Select approved strategy" />
          </SelectTrigger>
          <SelectContent className={pmSelectContentClass}>
            <SelectItem value="none" className={pmSelectItemClass}>
              Select strategy
            </SelectItem>
            {approvedStrategies.map((s) => (
              <SelectItem key={s.id} value={s.id} className={pmSelectItemClass}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PmFormField>

      <PmFormField
        label="Cycle Name"
        hint="A distinct name for this fundraising or trading period."
        required
      >
        <Input
          value={values.name}
          onChange={(e) => patch("name", e.target.value)}
          disabled={!editable}
          required
          placeholder="e.g. Q3 2026 Growth Cycle"
          className={pmInputClass}
        />
      </PmFormField>

      <PmFormField
        label="Description"
        hint="Explain what this cycle covers and any terms investors should know."
      >
        <Textarea
          value={values.description}
          onChange={(e) => patch("description", e.target.value)}
          disabled={!editable}
          rows={3}
          placeholder="Describe the cycle goals, timeline, and investor terms…"
          className={pmTextareaClass}
        />
      </PmFormField>

      <div className="grid gap-6 sm:grid-cols-2">
        <PmFormField
          label="Target Capital"
          hint="Total capital you aim to raise (USD). Optional for drafts."
        >
          <Input
            type="number"
            min={0}
            step="0.01"
            value={values.targetCapital}
            onChange={(e) => patch("targetCapital", e.target.value)}
            disabled={!editable}
            placeholder="100000"
            className={pmInputClass}
          />
        </PmFormField>
        <PmFormField
          label="Min Investment"
          hint="Smallest amount one investor can commit. Must be greater than zero if set."
        >
          <Input
            type="number"
            min={0}
            step="0.01"
            value={values.minInvestment}
            onChange={(e) => patch("minInvestment", e.target.value)}
            disabled={!editable}
            placeholder="1000"
            className={pmInputClass}
          />
        </PmFormField>
        <PmFormField
          label="Max Capacity"
          hint="Hard cap on total allocations. Must be ≥ target capital, or leave blank."
        >
          <Input
            type="number"
            min={0}
            step="0.01"
            value={values.maxCapacity}
            onChange={(e) => patch("maxCapacity", e.target.value)}
            disabled={!editable}
            placeholder="250000"
            className={pmInputClass}
          />
        </PmFormField>
        <PmFormField
          label="Duration (days)"
          hint="How long the cycle runs once funded. Leave blank if not decided yet."
        >
          <Input
            type="number"
            min={1}
            value={values.durationDays}
            onChange={(e) => patch("durationDays", e.target.value)}
            disabled={!editable}
            placeholder="90"
            className={pmInputClass}
          />
        </PmFormField>
      </div>

      <PmFormField
        label="Funding Deadline"
        hint="Last date investors can commit capital to this cycle."
      >
        <Input
          type="datetime-local"
          value={values.fundingDeadline}
          onChange={(e) => patch("fundingDeadline", e.target.value)}
          disabled={!editable}
          className={pmInputClass}
        />
      </PmFormField>
    </div>
  );
}
