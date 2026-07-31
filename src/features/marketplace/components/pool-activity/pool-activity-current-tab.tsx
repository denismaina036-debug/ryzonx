"use client";

import { useMemo, useState } from "react";
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

interface PoolActivityCurrentTabProps {
  trades: PublicPoolTradeView[];
  cycles: PoolActivityCycleSummary[];
  activeCycle: PoolActivityCycleSummary | null;
  filters: PoolActivityFiltersState;
  onFiltersChange: (filters: PoolActivityFiltersState) => void;
}

export function PoolActivityCurrentTab({
  trades,
  cycles,
  activeCycle,
  filters,
  onFiltersChange,
}: PoolActivityCurrentTabProps) {
  const [selectedTrade, setSelectedTrade] = useState<PublicPoolTradeView | null>(null);

  const filteredTrades = useMemo(
    () => applyPoolActivityFilters(trades, filters),
    [trades, filters]
  );

  const assets = useMemo(() => collectTradeAssets(trades), [trades]);

  if (!activeCycle) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--id-border)] bg-[var(--id-surface)] p-8 text-center">
        <p className="text-sm text-[var(--id-text-muted)]">
          No active trading cycle for this pool.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PoolActivityFilters
        filters={filters}
        onChange={onFiltersChange}
        cycles={cycles}
        assets={assets}
        showCycleFilter={false}
      />

      {filteredTrades.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--id-border)] bg-[var(--id-surface)] p-8 text-center">
          <p className="text-sm text-[var(--id-text-muted)]">
            {trades.length === 0
              ? "No trades recorded in the current cycle yet."
              : "No trades match the selected filters."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filteredTrades.map((trade) => (
            <li key={trade.id}>
              <PoolActivityTradeCard trade={trade} onSelect={setSelectedTrade} />
            </li>
          ))}
        </ul>
      )}

      <PoolActivityTradeDetailDialog
        trade={selectedTrade}
        open={selectedTrade != null}
        onOpenChange={(open) => !open && setSelectedTrade(null)}
      />
    </div>
  );
}

export { EMPTY_POOL_ACTIVITY_FILTERS };
