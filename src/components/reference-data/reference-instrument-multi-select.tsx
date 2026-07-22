"use client";

import { useMemo } from "react";
import { ReferenceMultiSelect } from "@/components/reference-data/reference-multi-select";
import { useInstrumentsForMarkets } from "@/hooks/use-reference-data";
import { normalizeMarketCodes } from "@/domain/reference-data/utils";

interface ReferenceInstrumentMultiSelectProps {
  marketCodes: string[];
  value: string[];
  onChange: (codes: string[]) => void;
  disabled?: boolean;
}

export function ReferenceInstrumentMultiSelect({
  marketCodes,
  value,
  onChange,
  disabled,
}: ReferenceInstrumentMultiSelectProps) {
  const normalizedMarkets = useMemo(() => normalizeMarketCodes(marketCodes), [marketCodes]);
  const { items, loading, error } = useInstrumentsForMarkets(normalizedMarkets);
  const noMarkets = normalizedMarkets.length === 0;
  const safeValue = value ?? [];

  if (noMarkets) {
    return (
      <p className="text-sm text-[var(--id-text-muted)]">Select markets first</p>
    );
  }

  if (loading && items.length === 0) {
    return <p className="text-sm text-[var(--id-text-muted)]">Loading instruments…</p>;
  }

  if (error && items.length === 0) {
    return (
      <p className="text-sm text-rose-600">
        Could not load instruments. Refresh the page and try again.
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-[var(--id-text-muted)]">
        No instruments found for the selected markets.
      </p>
    );
  }

  return (
    <div className="max-h-72 overflow-y-auto rounded-lg border border-[var(--id-border)] p-3">
      <ReferenceMultiSelect
        options={items}
        value={safeValue}
        onChange={onChange}
        disabled={disabled}
        loading={loading}
      />
    </div>
  );
}
