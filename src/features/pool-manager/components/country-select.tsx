"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { COUNTRIES } from "@/constants/countries";
import { countryCodeToFlag } from "@/lib/country-flag";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface CountrySelectProps {
  value?: string;
  onChange: (countryCode: string) => void;
  disabled?: boolean;
  className?: string;
}

export function CountrySelect({ value, onChange, disabled, className }: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => COUNTRIES.find((c) => c.code === value?.toUpperCase()) ?? null,
    [value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-xl border border-[var(--id-border)] bg-[var(--id-surface)] px-4 text-sm text-[var(--id-text)] focus:outline-none focus:ring-2 focus:ring-[var(--id-accent)] disabled:opacity-50",
          className
        )}
      >
        <span className="truncate text-left">
          {selected ? (
            <span className="inline-flex items-center gap-2">
              <span aria-hidden>{countryCodeToFlag(selected.code)}</span>
              {selected.name}
            </span>
          ) : (
            <span className="text-[var(--id-text-muted)]">Select country</span>
          )}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[var(--id-text-muted)]" />
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-elevated)] shadow-lg">
          <div className="border-b border-[var(--id-border)] p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--id-text-muted)]" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search countries…"
                className="h-9 pl-9"
                autoFocus
              />
            </div>
          </div>
          <ul className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[var(--id-text-muted)]">No countries found</li>
            ) : (
              filtered.map((country) => (
                <li key={country.code}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(country.code);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[var(--id-surface-muted)]",
                      value?.toUpperCase() === country.code &&
                        "bg-[var(--id-accent-soft)] text-[var(--id-accent-text)]"
                    )}
                  >
                    <span className="text-base leading-none" aria-hidden>
                      {countryCodeToFlag(country.code)}
                    </span>
                    <span>{country.name}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
