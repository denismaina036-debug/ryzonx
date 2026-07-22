"use client";

import { cn } from "@/lib/utils";
import type { ReferenceDataOption } from "@/domain/reference-data/types";

interface ReferenceMultiSelectProps {
  options: ReferenceDataOption[];
  value: string[];
  onChange: (codes: string[]) => void;
  disabled?: boolean;
  loading?: boolean;
}

export function ReferenceMultiSelect({
  options,
  value,
  onChange,
  disabled,
  loading,
}: ReferenceMultiSelectProps) {
  const safeValue = value ?? [];

  if (loading && options.length === 0) {
    return <p className="text-sm text-[var(--id-text-muted)]">Loading…</p>;
  }

  if (options.length === 0) {
    return <p className="text-sm text-[var(--id-text-muted)]">No options available.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((market) => {
        const selected = safeValue.includes(market.code);
        return (
          <button
            key={market.code}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (safeValue.includes(market.code)) {
                onChange(safeValue.filter((v) => v !== market.code));
              } else {
                onChange([...safeValue, market.code]);
              }
            }}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition",
              selected
                ? "border-[var(--id-accent)] bg-[var(--id-accent-soft)] text-[var(--id-accent-text)]"
                : "border-[var(--id-border)] text-[var(--id-text-muted)]"
            )}
          >
            {market.label}
          </button>
        );
      })}
    </div>
  );
}
