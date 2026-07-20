"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface SearchableOption {
  value: string;
  label: string;
  keywords?: string;
  renderLabel?: React.ReactNode;
}

interface SearchableComboboxProps {
  options: SearchableOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  triggerClassName?: string;
  renderValue?: (option: SearchableOption | null) => React.ReactNode;
  /** When set, require this many search characters before listing options (large lists). */
  minSearchLength?: number;
  /** Max options rendered before search is required. */
  largeListThreshold?: number;
}

const PANEL_MAX_HEIGHT = 280;
const PANEL_GAP = 6;

export function SearchableCombobox({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyMessage = "No results found",
  disabled = false,
  loading = false,
  className,
  triggerClassName,
  renderValue,
  minSearchLength = 0,
  largeListThreshold = 50,
}: SearchableComboboxProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

  const requiresSearch =
    options.length > largeListThreshold &&
    query.trim().length < Math.max(minSearchLength, 1);

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (options.length > largeListThreshold && q.length < Math.max(minSearchLength, 1)) {
      return [];
    }
    if (!q) return options;
    return options.filter((o) => {
      const haystack = `${o.label} ${o.value} ${o.keywords ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [options, query, largeListThreshold, minSearchLength]);

  const listEmptyMessage = requiresSearch
    ? "Type to search…"
    : emptyMessage;

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - PANEL_GAP;
    const spaceAbove = rect.top - PANEL_GAP;
    const openUp = spaceBelow < PANEL_MAX_HEIGHT && spaceAbove > spaceBelow;

    const maxHeight = Math.min(
      PANEL_MAX_HEIGHT,
      openUp ? spaceAbove : spaceBelow
    );

    setPanelStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(160, maxHeight),
      top: openUp ? rect.top - PANEL_GAP : rect.bottom + PANEL_GAP,
      transform: openUp ? "translateY(-100%)" : undefined,
      zIndex: 9999,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [open, updatePanelPosition, filtered.length]);

  useEffect(() => {
    if (open) {
      setHighlightIndex(0);
      requestAnimationFrame(() => searchRef.current?.focus());
    } else {
      setQuery("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function selectOption(option: SearchableOption) {
    onChange(option.value);
    setOpen(false);
  }

  function onTriggerKeyDown(event: React.KeyboardEvent) {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  }

  function onSearchKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (event.key === "Enter" && filtered[highlightIndex]) {
      event.preventDefault();
      selectOption(filtered[highlightIndex]);
    }
  }

  const waitingForOptions = loading && options.length === 0;

  const panel = open && !disabled ? (
    <div
      ref={panelRef}
      style={panelStyle}
      className={cn(
        "overflow-hidden rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-elevated)] shadow-lg transition-opacity duration-150"
      )}
      role="listbox"
      id={listboxId}
    >
      <div className="border-b border-[var(--id-border)] p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--id-text-muted)]" />
          <Input
            ref={searchRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlightIndex(0);
            }}
            onKeyDown={onSearchKeyDown}
            placeholder={searchPlaceholder}
            className="h-9 pl-9"
            aria-controls={listboxId}
            aria-autocomplete="list"
          />
        </div>
      </div>
      <ul className="max-h-[220px] overflow-y-auto p-1">
        {loading ? (
          <li className="px-3 py-2 text-sm text-[var(--id-text-muted)]">Loading…</li>
        ) : filtered.length === 0 ? (
          <li className="px-3 py-2 text-sm text-[var(--id-text-muted)]">{listEmptyMessage}</li>
        ) : (
          filtered.map((option, index) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={value === option.value}
                onMouseEnter={() => setHighlightIndex(index)}
                onClick={() => selectOption(option)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition",
                  highlightIndex === index && "bg-[var(--id-surface-muted)]",
                  value === option.value &&
                    "bg-[var(--id-accent-soft)] text-[var(--id-accent-text)]"
                )}
              >
                {option.renderLabel ?? option.label}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  ) : null;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || waitingForOptions}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-xl border border-[var(--id-border)] bg-[var(--id-surface)] px-4 text-sm text-[var(--id-text)] focus:outline-none focus:ring-2 focus:ring-[var(--id-accent)] disabled:opacity-50",
          triggerClassName
        )}
      >
        <span className="truncate text-left">
          {waitingForOptions ? (
            <span className="text-[var(--id-text-muted)]">Loading…</span>
          ) : selected ? (
            renderValue ? renderValue(selected) : selected.label
          ) : (
            <span className="text-[var(--id-text-muted)]">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--id-text-muted)] transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {typeof document !== "undefined" && panel
        ? createPortal(panel, document.body)
        : null}
    </div>
  );
}
