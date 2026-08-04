"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ExperienceDurationUnit } from "@/domain/pool-manager/types";

export const EXPERIENCE_DURATION_UNITS: Array<{
  value: ExperienceDurationUnit;
  label: string;
}> = [
  { value: "days", label: "Days" },
  { value: "weeks", label: "Weeks" },
  { value: "months", label: "Months" },
  { value: "years", label: "Years" },
];

export function formatExperienceDuration(
  value?: number,
  unit?: ExperienceDurationUnit
): string | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  const match = EXPERIENCE_DURATION_UNITS.find((item) => item.value === (unit ?? "years"));
  const label = match?.label ?? "Years";
  return `${value} ${value === 1 ? label.replace(/s$/, "") : label}`;
}

interface ExperienceDurationInputProps {
  value?: number;
  unit?: ExperienceDurationUnit;
  onChange: (next: { value?: number; unit: ExperienceDurationUnit }) => void;
  disabled?: boolean;
  inputClassName?: string;
  selectTriggerClassName?: string;
  selectContentClassName?: string;
  selectItemClassName?: string;
}

export function ExperienceDurationInput({
  value,
  unit = "years",
  onChange,
  disabled,
  inputClassName,
  selectTriggerClassName,
  selectContentClassName,
  selectItemClassName,
}: ExperienceDurationInputProps) {
  return (
    <div className="flex gap-2">
      <Input
        type="number"
        min={1}
        inputMode="numeric"
        value={value ?? ""}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          onChange({
            value: event.target.value ? parsed : undefined,
            unit,
          });
        }}
        placeholder="e.g. 5"
        disabled={disabled}
        className={cn("min-w-0 flex-1", inputClassName)}
        aria-label="Experience duration amount"
      />
      <Select
        value={unit}
        onValueChange={(next) =>
          onChange({
            value,
            unit: next as ExperienceDurationUnit,
          })
        }
        disabled={disabled}
      >
        <SelectTrigger
          className={cn("w-[7.5rem] shrink-0", selectTriggerClassName)}
          aria-label="Experience duration unit"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={selectContentClassName}>
          {EXPERIENCE_DURATION_UNITS.map((item) => (
            <SelectItem key={item.value} value={item.value} className={selectItemClassName}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Maps legacy `yearsTrading` to the flexible duration fields when present. */
export function resolveExperienceDuration(basicInfo: {
  experienceDurationValue?: number;
  experienceDurationUnit?: ExperienceDurationUnit;
  yearsTrading?: number;
}): { value?: number; unit: ExperienceDurationUnit } {
  if (basicInfo.experienceDurationValue != null) {
    return {
      value: basicInfo.experienceDurationValue,
      unit: basicInfo.experienceDurationUnit ?? "years",
    };
  }

  if (basicInfo.yearsTrading != null) {
    return { value: basicInfo.yearsTrading, unit: "years" };
  }

  return { unit: "years" };
}

export function applyExperienceDurationChange(
  basicInfo: Record<string, unknown>,
  next: { value?: number; unit: ExperienceDurationUnit }
): Record<string, unknown> {
  return {
    ...basicInfo,
    experienceDurationValue: next.value,
    experienceDurationUnit: next.unit,
    yearsTrading: next.unit === "years" ? next.value : undefined,
  };
}
