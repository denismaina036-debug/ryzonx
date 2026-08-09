"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pmInputClass, pmPrimaryButtonClass } from "@/features/pool-manager/constants/ui";
import { PmFormField } from "@/features/pool-manager/components/workspace/pm-form-field";
import { PmFormMessage } from "@/features/pool-manager/components/workspace/pm-page-header";
import {
  PmRoiMultiplierEditor,
  type RoiMultiplierEntry,
} from "@/features/pool-manager/components/managed-pool/pm-roi-multiplier-editor";
import type { PlatformInvestmentLevel } from "@/domain/roi";
import {
  parseCycleAmount,
  parseCycleMinInvestment,
  validateCycleCapacityFields,
} from "@/domain/investment/cycle-validation";

export interface CreateCycleFormValues {
  name: string;
  durationDays: string;
  minInvestment: string;
  targetCapital: string;
  targetInvestors: string;
  multipliers: RoiMultiplierEntry[];
}

interface CreateCycleFormProps {
  poolId: string;
  poolName: string;
  cycleNumber: number;
  investmentLevels: PlatformInvestmentLevel[];
  values: CreateCycleFormValues;
  onChange: (values: CreateCycleFormValues) => void;
  onSubmit: () => void | Promise<void>;
  loading?: boolean;
  error?: string | null;
  submitLabel?: string;
  hint?: string;
}

export function CreateCycleForm({
  poolName,
  cycleNumber,
  investmentLevels,
  values,
  onChange,
  onSubmit,
  loading = false,
  error = null,
  submitLabel = "Create funding cycle",
  hint = "Set only the terms for this cycle. Pool branding, strategy, markets, and schedule stay inherited from the parent pool.",
}: CreateCycleFormProps) {
  function patch<K extends keyof CreateCycleFormValues>(key: K, value: CreateCycleFormValues[K]) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--id-text-muted)]">{hint}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <PmFormField label="Cycle name" required>
          <Input
            value={values.name}
            onChange={(e) => patch("name", e.target.value)}
            placeholder={`${poolName} — Cycle ${cycleNumber}`}
            className={pmInputClass}
          />
        </PmFormField>
        <PmFormField label="Trading duration (days)" required>
          <Input
            type="number"
            min={1}
            value={values.durationDays}
            onChange={(e) => patch("durationDays", e.target.value)}
            className={pmInputClass}
          />
        </PmFormField>
        <PmFormField label="Minimum investment (USD)" required>
          <Input
            type="number"
            min={1}
            value={values.minInvestment}
            onChange={(e) => patch("minInvestment", e.target.value)}
            className={pmInputClass}
          />
        </PmFormField>
        <PmFormField label="Target capital (USD)" required>
          <Input
            type="number"
            min={1}
            value={values.targetCapital}
            onChange={(e) => patch("targetCapital", e.target.value)}
            className={pmInputClass}
          />
        </PmFormField>
        <PmFormField label="Target investors" required>
          <Input
            type="number"
            min={1}
            value={values.targetInvestors}
            onChange={(e) => patch("targetInvestors", e.target.value)}
            className={pmInputClass}
          />
        </PmFormField>
      </div>

      {investmentLevels.length > 0 && (
        <PmFormField label="Profit multipliers (ROI)" hint="Per investment level for this cycle.">
          <PmRoiMultiplierEditor
            levels={investmentLevels}
            multipliers={values.multipliers}
            onChange={(multipliers) => patch("multipliers", multipliers)}
          />
        </PmFormField>
      )}

      <PmFormMessage message={error} variant="error" />
      <Button
        disabled={loading}
        className={pmPrimaryButtonClass}
        onClick={() => void onSubmit()}
      >
        {loading ? "Creating…" : submitLabel}
      </Button>
    </div>
  );
}

export function validateCreateCycleForm(values: CreateCycleFormValues): string | null {
  const parsed = {
    targetCapital: parseCycleAmount(values.targetCapital),
    minInvestment: parseCycleMinInvestment(values.minInvestment),
    durationDays: parseCycleAmount(values.durationDays),
  };
  const validationError = validateCycleCapacityFields(parsed);
  if (validationError) return validationError;
  if (!values.name.trim()) return "Cycle name is required.";
  const investors = parseCycleAmount(values.targetInvestors);
  if (!investors || investors <= 0) return "Target investors must be greater than zero.";
  return null;
}

export function buildCreateCyclePayload(values: CreateCycleFormValues) {
  const parsed = {
    targetCapital: parseCycleAmount(values.targetCapital)!,
    minInvestment: parseCycleMinInvestment(values.minInvestment)!,
    durationDays: parseCycleAmount(values.durationDays)!,
  };
  const investors = parseCycleAmount(values.targetInvestors)!;
  return {
    name: values.name.trim(),
    durationDays: parsed.durationDays,
    minInvestment: parsed.minInvestment,
    targetCapital: parsed.targetCapital,
    targetInvestors: investors,
    maxCapacity: parsed.targetCapital,
    roiMultipliers: values.multipliers
      .filter((entry) => entry.multiplier.trim())
      .map((entry) => ({
        investmentLevelId: entry.investmentLevelId,
        multiplier: Number(entry.multiplier),
      })),
  };
}
