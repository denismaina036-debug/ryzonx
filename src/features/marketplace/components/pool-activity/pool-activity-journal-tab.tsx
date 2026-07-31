"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { PublicPoolTradeView } from "@/domain/trading-journal/types";
import type { PoolActivityCycleSummary } from "@/domain/marketplace/pool-activity";
import { PoolActivityTradeCard } from "@/features/marketplace/components/pool-activity/pool-activity-trade-card";
import { PoolActivityTradeDetailDialog } from "@/features/marketplace/components/pool-activity/pool-activity-trade-detail-dialog";
import {
  PoolActivityFilters,
  EMPTY_POOL_ACTIVITY_FILTERS,
  applyPoolActivityFilters,
  collectTradeAssets,
  type PoolActivityFiltersState,
} from "@/features/marketplace/components/pool-activity/pool-activity-filters";
import { cn } from "@/lib/utils";

interface PoolActivityJournalTabProps {
  trades: PublicPoolTradeView[];
  cycles: PoolActivityCycleSummary[];
  filters: PoolActivityFiltersState;
  onFiltersChange: (filters: PoolActivityFiltersState) => void;
}

export function PoolActivityJournalTab({
  trades,
  cycles,
  filters,
  onFiltersChange,
}: PoolActivityJournalTabProps) {
  const [selectedTrade, setSelectedTrade] = useState<PublicPoolTradeView | null>(null);
  const [expandedCycles, setExpandedCycles] = useState<Set<string>>(
    () => new Set(cycles.slice(0, 2).map((c) => c.id))
  );

  const filteredTrades = useMemo(
    () => applyPoolActivityFilters(trades, filters),
    [trades, filters]
  );

  const assets = useMemo(() => collectTradeAssets(trades), [trades]);

  const grouped = useMemo(() => {
    const map = new Map<string, PublicPoolTradeView[]>();
    for (const trade of filteredTrades) {
      const list = map.get(trade.investmentCycleId) ?? [];
      list.push(trade);
      map.set(trade.investmentCycleId, list);
    }
    return cycles
      .filter((cycle) => map.has(cycle.id))
      .map((cycle) => ({
        cycle,
        trades: map.get(cycle.id) ?? [],
      }));
  }, [filteredTrades, cycles]);

  const toggleCycle = (cycleId: string) => {
    setExpandedCycles((prev) => {
      const next = new Set(prev);
      if (next.has(cycleId)) next.delete(cycleId);
      else next.add(cycleId);
      return next;
    });
  };

  if (trades.length === 0) {
    return (
      <EmptyJournal message="No trades have been recorded for this pool yet." />
    );
  }

  return (
    <div className="space-y-4">
      <PoolActivityFilters
        filters={filters}
        onChange={onFiltersChange}
        cycles={cycles}
        assets={assets}
      />

      {grouped.length === 0 ? (
        <EmptyJournal message="No trades match the selected filters." />
      ) : (
        <div className="space-y-3">
          {grouped.map(({ cycle, trades: cycleTrades }) => {
            const expanded = expandedCycles.has(cycle.id);
            return (
              <section
                key={cycle.id}
                className="overflow-hidden rounded-xl border border-[var(--id-border)] bg-[var(--id-surface)]"
              >
                <button
                  type="button"
                  onClick={() => toggleCycle(cycle.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[var(--id-surface-muted)]"
                >
                  <div>
                    <p className="font-semibold text-[var(--id-text)]">{cycle.name}</p>
                    <p className="text-xs text-[var(--id-text-muted)]">
                      {cycleTrades.length} trade{cycleTrades.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 text-[var(--id-text-muted)] transition-transform",
                      expanded && "rotate-180"
                    )}
                  />
                </button>

                {expanded && (
                  <ul className="space-y-2 border-t border-[var(--id-border)] p-3">
                    {cycleTrades.map((trade) => (
                      <li key={trade.id}>
                        <PoolActivityTradeCard
                          trade={trade}
                          onSelect={setSelectedTrade}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      <PoolActivityTradeDetailDialog
        trade={selectedTrade}
        open={selectedTrade != null}
        onOpenChange={(open) => !open && setSelectedTrade(null)}
      />
    </div>
  );
}

function EmptyJournal({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--id-border)] bg-[var(--id-surface)] p-8 text-center">
      <p className="text-sm text-[var(--id-text-muted)]">{message}</p>
    </div>
  );
}

export { EMPTY_POOL_ACTIVITY_FILTERS };
