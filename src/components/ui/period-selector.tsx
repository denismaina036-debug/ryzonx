"use client";

import { cn } from "@/lib/utils";
import type { PerformancePeriod } from "@/types";

const PERIODS: { value: PerformancePeriod; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

interface PeriodSelectorProps {
  value: PerformancePeriod;
  onChange: (period: PerformancePeriod) => void;
  className?: string;
}

export function PeriodSelector({
  value,
  onChange,
  className,
}: PeriodSelectorProps) {
  return (
    <div
      className={cn(
        "inline-flex rounded-xl border border-border bg-surface-1 p-1",
        className
      )}
    >
      {PERIODS.map((period) => (
        <button
          key={period.value}
          type="button"
          onClick={() => onChange(period.value)}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
            value === period.value
              ? "bg-navy-900 text-white shadow-sm"
              : "text-navy-600 hover:text-navy-900"
          )}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
