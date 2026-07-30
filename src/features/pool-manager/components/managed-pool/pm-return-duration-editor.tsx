"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PmFormField } from "@/features/pool-manager/components/workspace/pm-form-field";
import {
  pmInputClass,
  pmSelectContentClass,
  pmSelectItemClass,
  pmSelectTriggerClass,
} from "@/features/pool-manager/constants/ui";
import {
  RETURN_DURATION_PRESETS,
  RETURN_DURATION_PRESET_LABELS,
  RETURN_DURATION_UNITS,
  type ReturnDurationPreset,
  type ReturnDurationUnit,
} from "@/domain/roi";

interface PmReturnDurationEditorProps {
  preset: ReturnDurationPreset;
  value: string;
  unit: ReturnDurationUnit;
  onPresetChange: (preset: ReturnDurationPreset) => void;
  onValueChange: (value: string) => void;
  onUnitChange: (unit: ReturnDurationUnit) => void;
  disabled?: boolean;
}

export function PmReturnDurationEditor({
  preset,
  value,
  unit,
  onPresetChange,
  onValueChange,
  onUnitChange,
  disabled = false,
}: PmReturnDurationEditorProps) {
  const isCustom = preset === "custom";

  return (
    <div className="space-y-4">
      <PmFormField
        label="Return Duration"
        hint="The investment cycle duration investors will see."
        required
      >
        <Select
          value={preset}
          onValueChange={(v) => onPresetChange(v as ReturnDurationPreset)}
          disabled={disabled}
        >
          <SelectTrigger className={pmSelectTriggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={pmSelectContentClass}>
            {RETURN_DURATION_PRESETS.map((p) => (
              <SelectItem key={p} value={p} className={pmSelectItemClass}>
                {RETURN_DURATION_PRESET_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PmFormField>

      {isCustom && (
        <div className="grid gap-4 sm:grid-cols-2">
          <PmFormField label="Duration Value" required hint="e.g. 24, 48, 7, 14, 30">
            <Input
              type="number"
              min={1}
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              disabled={disabled}
              className={pmInputClass}
              placeholder="e.g. 24"
            />
          </PmFormField>
          <PmFormField label="Duration Unit" required>
            <Select
              value={unit}
              onValueChange={(v) => onUnitChange(v as ReturnDurationUnit)}
              disabled={disabled}
            >
              <SelectTrigger className={pmSelectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={pmSelectContentClass}>
                {RETURN_DURATION_UNITS.map((u) => (
                  <SelectItem key={u} value={u} className={`${pmSelectItemClass} capitalize`}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </PmFormField>
        </div>
      )}
    </div>
  );
}
