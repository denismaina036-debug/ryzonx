"use client";

import { useMemo } from "react";
import type { PublicPoolTradeView } from "@/domain/trading-journal/types";
import type { PoolActivityCycleSummary } from "@/domain/marketplace/pool-activity";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface PoolActivityFiltersState {
  asset: string;
  cycleId: string;
  direction: "" | "long" | "short";
  result: "" | "profit" | "loss" | "breakeven";
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_POOL_ACTIVITY_FILTERS: PoolActivityFiltersState = {
  asset: "",
  cycleId: "",
  direction: "",
  result: "",
  dateFrom: "",
  dateTo: "",
};

interface PoolActivityFiltersProps {
  filters: PoolActivityFiltersState;
  onChange: (next: PoolActivityFiltersState) => void;
  cycles: PoolActivityCycleSummary[];
  assets: string[];
  showCycleFilter?: boolean;
  className?: string;
}

export function PoolActivityFilters({
  filters,
  onChange,
  cycles,
  assets,
  showCycleFilter = true,
  className,
}: PoolActivityFiltersProps) {
  return (
    <div
      className={cn(
        "grid gap-3 rounded-xl border border-[var(--id-border)] bg-[var(--id-surface)] p-4",
        "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
        className
      )}
    >
      <FilterField label="Asset">
        <select
          value={filters.asset}
          onChange={(e) => onChange({ ...filters, asset: e.target.value })}
          className={selectClass}
        >
          <option value="">All assets</option>
          {assets.map((asset) => (
            <option key={asset} value={asset}>
              {asset}
            </option>
          ))}
        </select>
      </FilterField>

      {showCycleFilter && (
        <FilterField label="Cycle">
          <select
            value={filters.cycleId}
            onChange={(e) => onChange({ ...filters, cycleId: e.target.value })}
            className={selectClass}
          >
            <option value="">All cycles</option>
            {cycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name}
              </option>
            ))}
          </select>
        </FilterField>
      )}

      <FilterField label="Direction">
        <select
          value={filters.direction}
          onChange={(e) =>
            onChange({
              ...filters,
              direction: e.target.value as PoolActivityFiltersState["direction"],
            })
          }
          className={selectClass}
        >
          <option value="">All</option>
          <option value="long">Buy</option>
          <option value="short">Sell</option>
        </select>
      </FilterField>

      <FilterField label="Result">
        <select
          value={filters.result}
          onChange={(e) =>
            onChange({
              ...filters,
              result: e.target.value as PoolActivityFiltersState["result"],
            })
          }
          className={selectClass}
        >
          <option value="">All</option>
          <option value="profit">Win</option>
          <option value="loss">Loss</option>
          <option value="breakeven">Breakeven</option>
        </select>
      </FilterField>

      <FilterField label="Date from">
        <Input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
          className="h-10"
        />
      </FilterField>

      <FilterField label="Date to" className="sm:col-span-2 lg:col-span-1">
        <Input
          type="date"
          value={filters.dateTo}
          onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
          className="h-10"
        />
      </FilterField>
    </div>
  );
}

const selectClass =
  "flex h-10 w-full rounded-md border border-[var(--id-border)] bg-[var(--id-bg)] px-3 py-2 text-sm text-[var(--id-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--id-accent)]";

function FilterField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--id-text-faint)]">
        {label}
      </span>
      {children}
    </label>
  );
}

export function applyPoolActivityFilters(
  trades: PublicPoolTradeView[],
  filters: PoolActivityFiltersState
): PublicPoolTradeView[] {
  return trades.filter((trade) => {
    if (filters.asset && trade.instrument !== filters.asset) return false;
    if (filters.cycleId && trade.investmentCycleId !== filters.cycleId) return false;
    if (filters.direction && trade.direction !== filters.direction) return false;
    if (filters.result && trade.tradeResult !== filters.result) return false;
    if (!trade.closedAt) return !filters.dateFrom && !filters.dateTo;
    const closed = new Date(trade.closedAt);
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      from.setHours(0, 0, 0, 0);
      if (closed < from) return false;
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      if (closed > to) return false;
    }
    return true;
  });
}

export function collectTradeAssets(trades: PublicPoolTradeView[]): string[] {
  return [...new Set(trades.map((t) => t.instrument))].sort();
}

export function useFilteredTrades(
  trades: PublicPoolTradeView[],
  filters: PoolActivityFiltersState
): PublicPoolTradeView[] {
  return useMemo(() => applyPoolActivityFilters(trades, filters), [trades, filters]);
}
