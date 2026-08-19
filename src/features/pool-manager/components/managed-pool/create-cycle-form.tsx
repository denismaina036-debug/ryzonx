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
import { PmReturnDurationEditor } from "@/features/pool-manager/components/managed-pool/pm-return-duration-editor";
import type { PlatformInvestmentLevel } from "@/domain/roi";
import type { ReturnDurationPreset, ReturnDurationUnit } from "@/domain/roi/types";
import {
  parseCycleAmount,
  parseCycleInvestorCount,
  parseCycleMinInvestment,
  resolveCycleDurationDays,
  validateCycleCapacityFields,
  validateCycleReturnDuration,
  validateCycleRoiMultipliers,
} from "@/domain/investment/cycle-validation";
import { resolveReturnDuration } from "@/domain/roi/return-duration";

export interface CreateCycleFormValues {
  name: string;
  returnDurationPreset: ReturnDurationPreset;
  returnDurationValue: string;
  returnDurationUnit: ReturnDurationUnit;
  minInvestment: string;
  targetCapital: string;
  initialRaisedCapital: string;
  targetInvestors: string;
  multipliers: RoiMultiplierEntry[];
}

export const DEFAULT_CREATE_CYCLE_FORM_VALUES: CreateCycleFormValues = {
  name: "",
  returnDurationPreset: "daily",
  returnDurationValue: "1",
  returnDurationUnit: "days",
  minInvestment: "",
  targetCapital: "",
  initialRaisedCapital: "",
  targetInvestors: "",
  multipliers: [],
};

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
  hint = "Set the funding terms for this cycle only. Target capital, payout duration, and initial raised capital apply to this round — they are not inherited from the parent pool.",
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
        <PmFormField
          label="Initial raised capital (USD)"
          hint="Starting capital for this cycle before investor commitments (optional)."
        >
          <Input
            type="number"
            min={0}
            value={values.initialRaisedCapital}
            onChange={(e) => patch("initialRaisedCapital", e.target.value)}
            className={pmInputClass}
          />
        </PmFormField>
        <PmFormField label="Target investors" required>
          <Input
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={values.targetInvestors}
            onChange={(e) => patch("targetInvestors", e.target.value)}
            className={pmInputClass}
          />
        </PmFormField>
      </div>

      <PmFormField
        label="Payout duration"
        hint="How long this cycle will trade after funding closes. Each cycle can use its own duration."
        required
      >
        <PmReturnDurationEditor
          preset={values.returnDurationPreset}
          value={values.returnDurationValue}
          unit={values.returnDurationUnit}
          onPresetChange={(preset) => {
            if (preset === "hourly") {
              onChange({
                ...values,
                returnDurationPreset: preset,
                returnDurationUnit: "hours",
                returnDurationValue:
                  values.returnDurationUnit === "hours" && values.returnDurationValue.trim()
                    ? values.returnDurationValue
                    : "4",
              });
              return;
            }
            patch("returnDurationPreset", preset);
          }}
          onValueChange={(v) => patch("returnDurationValue", v)}
          onUnitChange={(unit) => patch("returnDurationUnit", unit)}
        />
      </PmFormField>

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

export function validateCreateCycleForm(
  values: CreateCycleFormValues,
  options?: { requireMultipliers?: boolean }
): string | null {
  const parsed = {
    targetCapital: parseCycleAmount(values.targetCapital),
    minInvestment: parseCycleMinInvestment(values.minInvestment),
  };
  const resolved = resolveReturnDuration({
    preset: values.returnDurationPreset,
    value: parseCycleAmount(values.returnDurationValue),
    unit: values.returnDurationUnit,
  });
  const durationDays = resolveCycleDurationDays({
    preset: values.returnDurationPreset,
    value: resolved.value,
    unit: resolved.unit,
  });
  const validationError = validateCycleCapacityFields({
    ...parsed,
    durationDays,
  });
  if (validationError) return validationError;
  const returnDurationError = validateCycleReturnDuration({
    preset: values.returnDurationPreset,
    value: resolved.value,
    unit: resolved.unit,
  });
  if (returnDurationError) return returnDurationError;
  if (options?.requireMultipliers !== false) {
    const roiError = validateCycleRoiMultipliers(
      values.multipliers.map((entry) => ({
        investmentLevelId: entry.investmentLevelId,
        multiplier: entry.multiplier,
      }))
    );
    if (roiError) return roiError;
  }
  if (!values.name.trim()) return "Cycle name is required.";
  const investors = parseCycleInvestorCount(values.targetInvestors);
  if (investors == null) return "Target investors must be a whole number greater than zero.";
  return null;
}

export function buildCreateCyclePayload(values: CreateCycleFormValues) {
  const parsed = {
    targetCapital: parseCycleAmount(values.targetCapital)!,
    minInvestment: parseCycleMinInvestment(values.minInvestment)!,
  };
  const resolved = resolveReturnDuration({
    preset: values.returnDurationPreset,
    value: parseCycleAmount(values.returnDurationValue),
    unit: values.returnDurationUnit,
  });
  const durationDays = resolveCycleDurationDays({
    preset: values.returnDurationPreset,
    value: resolved.value,
    unit: resolved.unit,
  });
  const investors = parseCycleInvestorCount(values.targetInvestors)!;
  const initialRaised = parseCycleAmount(values.initialRaisedCapital);
  return {
    name: values.name.trim(),
    durationDays,
    minInvestment: parsed.minInvestment,
    targetCapital: parsed.targetCapital,
    targetInvestors: investors,
    returnDurationPreset: values.returnDurationPreset,
    returnDurationValue: resolved.value,
    returnDurationUnit: resolved.unit,
    ...(initialRaised != null && initialRaised > 0
      ? { initialRaisedCapital: initialRaised }
      : {}),
    maxCapacity: parsed.targetCapital,
    roiMultipliers: values.multipliers
      .filter((entry) => entry.multiplier.trim())
      .map((entry) => ({
        investmentLevelId: entry.investmentLevelId,
        multiplier: Number(entry.multiplier),
      })),
  };
}
