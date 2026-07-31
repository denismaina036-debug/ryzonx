"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { INVESTMENT_CYCLE_STATUS_LABELS } from "@/constants/investment-cycle";
import type { PoolActivityPageData } from "@/domain/marketplace/pool-activity";
import type { InvestmentCycleStatus } from "@/constants/investment-cycle";
import {
  MarketplaceBreadcrumb,
  marketplaceHomeCrumb,
  opportunityCrumb,
} from "@/features/marketplace/components/marketplace-breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  PoolActivityCurrentTab,
  EMPTY_POOL_ACTIVITY_FILTERS,
} from "@/features/marketplace/components/pool-activity/pool-activity-current-tab";
import {
  PoolActivityJournalTab,
} from "@/features/marketplace/components/pool-activity/pool-activity-journal-tab";
import type { PoolActivityFiltersState } from "@/features/marketplace/components/pool-activity/pool-activity-filters";
import { formatCurrency } from "@/lib/utils";

interface PoolActivityViewProps {
  data: PoolActivityPageData;
}

export function PoolActivityView({ data }: PoolActivityViewProps) {
  const [currentFilters, setCurrentFilters] =
    useState<PoolActivityFiltersState>(EMPTY_POOL_ACTIVITY_FILTERS);
  const [journalFilters, setJournalFilters] =
    useState<PoolActivityFiltersState>(EMPTY_POOL_ACTIVITY_FILTERS);

  const displayName = data.displayPoolName || data.poolName;
  const activeCycle = data.activeCycle;
  const tradesRecorded = activeCycle?.tradeCount ?? 0;
  const cycleProfit = activeCycle?.cycleProfit ?? 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      <MarketplaceBreadcrumb
        items={[
          marketplaceHomeCrumb(),
          opportunityCrumb(data.poolSlug, data.poolName),
          { label: "Pool Activity", href: `${ROUTES.marketplace}/${data.poolSlug}/activity` },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="ghost" size="sm" className="w-fit px-0 hover:bg-transparent">
          <Link href={`${ROUTES.marketplace}/${data.poolSlug}`} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to pool
          </Link>
        </Button>
      </div>

      <header className="rounded-xl border border-[var(--id-border)] bg-[var(--id-surface)] p-5 sm:p-6">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--id-text)] sm:text-2xl">
          {displayName}
        </h1>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <HeaderStat
            label="Current Trading Cycle"
            value={activeCycle?.name ?? "—"}
          />
          <HeaderStat
            label="Current Cycle Status"
            value={
              activeCycle
                ? INVESTMENT_CYCLE_STATUS_LABELS[activeCycle.status as InvestmentCycleStatus]
                : "—"
            }
          />
          <HeaderStat label="Trades Recorded" value={String(tradesRecorded)} />
          <HeaderStat
            label="Current Cycle Profit"
            value={formatCurrency(cycleProfit)}
            emphasize
          />
        </dl>
      </header>

      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:inline-flex sm:w-auto">
          <TabsTrigger value="current" className="min-h-11 px-4">
            Current Cycle
          </TabsTrigger>
          <TabsTrigger value="journal" className="min-h-11 px-4">
            Pool Journal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          <PoolActivityCurrentTab
            trades={data.currentCycleTrades}
            cycles={data.cycles}
            activeCycle={data.activeCycle}
            filters={currentFilters}
            onFiltersChange={setCurrentFilters}
          />
        </TabsContent>

        <TabsContent value="journal">
          <PoolActivityJournalTab
            trades={data.journalTrades}
            cycles={data.cycles}
            filters={journalFilters}
            onFiltersChange={setJournalFilters}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HeaderStat({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-[var(--id-text-faint)]">
        {label}
      </dt>
      <dd
        className={
          emphasize
            ? "mt-1 text-lg font-semibold tabular-nums text-[var(--id-text)] sm:text-xl"
            : "mt-1 text-base font-medium text-[var(--id-text)]"
        }
      >
        {value}
      </dd>
    </div>
  );
}
