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
  const { items, loading } = useInstrumentsForMarkets(normalizedMarkets);
  const noMarkets = normalizedMarkets.length === 0;

  if (noMarkets) {
    return (
      <p className="text-sm text-[var(--id-text-muted)]">Select markets first</p>
    );
  }

  return (
    <ReferenceMultiSelect
      options={items}
      value={value}
      onChange={onChange}
      disabled={disabled}
      loading={loading}
    />
  );
}
