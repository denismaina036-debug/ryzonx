"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TRADING_DAY_OPTIONS,
  TRADING_SCHEDULE_PRESETS,
  TRADING_TIME_ZONE_LABEL,
  formatTradingScheduleLabel,
  type TradingDayValue,
} from "@/domain/pools/trading-session";
import { PmFormField } from "@/features/pool-manager/components/workspace/pm-form-field";
import {
  pmInputClass,
  pmSelectContentClass,
  pmSelectItemClass,
  pmSelectTriggerClass,
} from "@/features/pool-manager/constants/ui";

interface PmTradingScheduleEditorProps {
  preset: string;
  days: string[];
  time: string;
  onPresetChange: (preset: string) => void;
  onDaysChange: (days: string[]) => void;
  onTimeChange: (time: string) => void;
  disabled?: boolean;
}

export function PmTradingScheduleEditor({
  preset,
  days,
  time,
  onPresetChange,
  onDaysChange,
  onTimeChange,
  disabled = false,
}: PmTradingScheduleEditorProps) {
  const preview = formatTradingScheduleLabel({ preset, days, time });

  function toggleDay(day: TradingDayValue) {
    if (disabled) return;
    if (days.includes(day)) {
      onDaysChange(days.filter((value) => value !== day));
      return;
    }
    onDaysChange([...days, day]);
  }

  return (
    <div className="space-y-6">
      <PmFormField
        label="Trading Days"
        hint="When you regularly start trading each week."
        required
      >
        <Select
          value={preset || "none"}
          onValueChange={(value) => onPresetChange(value === "none" ? "" : value)}
          disabled={disabled}
        >
          <SelectTrigger className={pmSelectTriggerClass}>
            <SelectValue placeholder="Select schedule" />
          </SelectTrigger>
          <SelectContent className={pmSelectContentClass}>
            <SelectItem value="none" className={pmSelectItemClass}>
              Select schedule
            </SelectItem>
            {TRADING_SCHEDULE_PRESETS.map((option) => (
              <SelectItem key={option.value} value={option.value} className={pmSelectItemClass}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PmFormField>

      {preset === "custom" && (
        <PmFormField label="Select Days" required>
          <div className="flex flex-wrap gap-2">
            {TRADING_DAY_OPTIONS.map((option) => {
              const selected = days.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleDay(option.value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    selected
                      ? "border-[var(--id-accent)] bg-[var(--id-accent-soft)] text-[var(--id-accent-text)]"
                      : "border-[var(--id-border)] bg-[var(--id-surface)] text-[var(--id-text-muted)] hover:border-[var(--id-accent)]/40"
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </PmFormField>
      )}

      <PmFormField
        label="Trading Start Time"
        hint={`Exact time you begin trading — ${TRADING_TIME_ZONE_LABEL}.`}
        required
      >
        <Input
          type="time"
          value={time}
          onChange={(event) => onTimeChange(event.target.value)}
          disabled={disabled}
          className={pmInputClass}
        />
      </PmFormField>

      {preview ? (
        <p className="rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] px-4 py-3 text-sm text-[var(--id-text)]">
          Investors will see: <span className="font-medium">{preview}</span>
        </p>
      ) : null}
    </div>
  );
}
