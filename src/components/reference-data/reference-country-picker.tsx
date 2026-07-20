"use client";

import { useMemo } from "react";
import { SearchableCombobox } from "@/components/reference-data/searchable-combobox";
import { useReferenceData } from "@/hooks/use-reference-data";
import { REFERENCE_SET_KEYS } from "@/domain/reference-data/set-keys";
import { countryCodeToFlag } from "@/lib/country-flag";

interface ReferenceCountryPickerProps {
  value?: string;
  onChange: (countryCode: string) => void;
  disabled?: boolean;
}

export function ReferenceCountryPicker({
  value,
  onChange,
  disabled,
}: ReferenceCountryPickerProps) {
  const { items, loading } = useReferenceData(REFERENCE_SET_KEYS.COUNTRIES);

  const options = useMemo(
    () =>
      items.map((country) => ({
        value: country.code,
        label: country.label,
        keywords: country.searchText,
        renderLabel: (
          <span className="inline-flex items-center gap-2">
            <span className="text-base leading-none" aria-hidden>
              {countryCodeToFlag(country.code)}
            </span>
            <span>{country.label}</span>
            <span className="text-[var(--id-text-muted)]">{country.code}</span>
          </span>
        ),
      })),
    [items]
  );

  const selectedRenderer = useMemo(() => {
    function CountrySelectedValue(option: { value: string; label: string } | null) {
      if (!option) return null;
      return (
        <span className="inline-flex items-center gap-2">
          <span aria-hidden>{countryCodeToFlag(option.value)}</span>
          <span>{option.label}</span>
          <span className="text-xs text-[var(--id-text-muted)]">{option.value}</span>
        </span>
      );
    }
    return CountrySelectedValue;
  }, []);

  return (
    <SearchableCombobox
      options={options}
      value={value}
      onChange={onChange}
      disabled={disabled}
      loading={loading}
      placeholder="Select country…"
      searchPlaceholder="Search by name or ISO code…"
      emptyMessage="No countries found"
      renderValue={selectedRenderer}
    />
  );
}
