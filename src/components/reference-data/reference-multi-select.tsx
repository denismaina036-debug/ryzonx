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
  function toggle(code: string) {
    if (value.includes(code)) {
      onChange(value.filter((v) => v !== code));
    } else {
      onChange([...value, code]);
    }
  }

  if (loading && options.length === 0) {
    return <p className="text-sm text-[var(--id-text-muted)]">Loading markets…</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((market) => {
        const selected = value.includes(market.code);
        return (
          <button
            key={market.code}
            type="button"
            disabled={disabled}
            onClick={() => toggle(market.code)}
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
