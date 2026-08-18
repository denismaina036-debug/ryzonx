"use client";

import { Input } from "@/components/ui/input";
import type { ManagedPoolFormInput } from "@/domain/pools/managed-pool";
import type { PlatformInvestmentLevel } from "@/domain/roi";
import { pmInputClass } from "@/features/pool-manager/constants/ui";
import { PmFormField } from "@/features/pool-manager/components/workspace/pm-form-field";
import { PmSectionCard } from "@/features/pool-manager/components/workspace/pm-page-header";
import { PmReturnDurationEditor } from "./pm-return-duration-editor";
import { PmRoiMultiplierEditor } from "./pm-roi-multiplier-editor";

export function DraftCycleDefaultsForm({
  values,
  onChange,
  investmentLevels,
  editable,
}: {
  values: ManagedPoolFormInput;
  onChange: (values: ManagedPoolFormInput) => void;
  investmentLevels: PlatformInvestmentLevel[];
  editable: boolean;
}) {
  function patch<K extends keyof ManagedPoolFormInput>(key: K, value: ManagedPoolFormInput[K]) {
    onChange({ ...values, [key]: value });
  }

  return (
    <PmSectionCard
      title="Cycle 1 defaults"
      description="These short-term funding terms apply when RyvonX approves your pool and opens Cycle 1. Later cycles are created separately inside this pool."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <PmFormField label="Minimum investment (USD)" required>
          <Input
            type="number"
            min={1}
            value={values.minInvestment}
            onChange={(e) => patch("minInvestment", e.target.value)}
            disabled={!editable}
            className={pmInputClass}
          />
        </PmFormField>
        <PmFormField label="Target capital (USD)" required>
          <Input
            type="number"
            min={1}
            value={values.maxPoolSize}
            onChange={(e) => patch("maxPoolSize", e.target.value)}
            disabled={!editable}
            className={pmInputClass}
          />
        </PmFormField>
        <PmFormField label="Target investors" required>
          <Input
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={values.maxInvestors}
            onChange={(e) => patch("maxInvestors", e.target.value)}
            disabled={!editable}
            className={pmInputClass}
          />
        </PmFormField>
        <PmFormField label="Funding period (days)" hint="How long Cycle 1 accepts investors.">
          <Input
            type="number"
            min={1}
            value={values.fundingPeriodDays}
            onChange={(e) => patch("fundingPeriodDays", e.target.value)}
            disabled={!editable}
            className={pmInputClass}
          />
        </PmFormField>
      </div>

      <div className="mt-6 space-y-6">
        <PmFormField label="Trading duration" hint="How long Cycle 1 will trade after funding closes.">
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
            disabled={!editable}
          />
        </PmFormField>

        {investmentLevels.length > 0 && (
          <PmFormField label="Profit multipliers (ROI)">
            <PmRoiMultiplierEditor
              levels={investmentLevels}
              multipliers={values.roiMultipliers}
              onChange={(roiMultipliers) => patch("roiMultipliers", roiMultipliers)}
              disabled={!editable}
            />
          </PmFormField>
        )}
      </div>
    </PmSectionCard>
  );
}
