"use client";

import { useMemo } from "react";
import { SearchableCombobox } from "@/components/reference-data/searchable-combobox";
import { useInstrumentsForMarkets } from "@/hooks/use-reference-data";
import { normalizeMarketCodes } from "@/domain/reference-data/utils";
import type { ReferenceDataOption } from "@/domain/reference-data/types";

interface ReferenceInstrumentPickerProps {
  marketCodes: string[];
  value?: string;
  onChange: (instrumentCode: string) => void;
  disabled?: boolean;
}

export function ReferenceInstrumentPicker({
  marketCodes,
  value,
  onChange,
  disabled,
}: ReferenceInstrumentPickerProps) {
  const normalizedMarkets = useMemo(() => normalizeMarketCodes(marketCodes), [marketCodes]);
  const { items, loading } = useInstrumentsForMarkets(normalizedMarkets);

  const options = useMemo(
    () =>
      items.map((item: ReferenceDataOption) => ({
        value: item.code,
        label: item.label,
        keywords: item.searchText,
      })),
    [items]
  );

  const noMarkets = normalizedMarkets.length === 0;

  return (
    <SearchableCombobox
      options={options}
      value={value}
      onChange={onChange}
      disabled={disabled || noMarkets}
      loading={loading}
      minSearchLength={1}
      largeListThreshold={40}
      placeholder={
        noMarkets ? "Select markets first" : "Search instruments…"
      }
      searchPlaceholder="Type to search instruments…"
      emptyMessage={
        noMarkets ? "Select at least one market above" : "No instruments found"
      }
    />
  );
}
