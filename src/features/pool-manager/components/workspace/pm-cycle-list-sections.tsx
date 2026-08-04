"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ROUTES } from "@/constants/routes";
import type { InvestmentCycle } from "@/domain/investment/types";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { isCycleFundingPhase, isCycleTradingPhase } from "@/lib/investment/cycle-display-phase";
import { PmFundingProgress } from "./pm-funding-progress";
import { PmStatusBadge } from "./pm-status-badge";
import { PmSectionCard } from "./pm-page-header";
import { pmCardClass, pmStatLabelClass, pmStatValueClass } from "@/features/pool-manager/constants/ui";
import type { CycleLiveSummary } from "@/services/cycle-live-metrics.service";

const FUNDING_STATUSES = new Set(["approved", "funding"]);
const TRADING_STATUSES = new Set(["trading", "distribution"]);

function useTradingSummaries(tradingCycles: InvestmentCycle[]) {
  const [summaries, setSummaries] = useState<Map<string, CycleLiveSummary>>(new Map());

  const idsKey = useMemo(
    () => tradingCycles.map((cycle) => cycle.id).sort().join(","),
    [tradingCycles]
  );

  useEffect(() => {
    if (!idsKey) {
      setSummaries(new Map());
      return;
    }

    let cancelled = false;

    async function load() {
      const res = await fetch(
        `/api/pool-manager/investment-cycles/live-summary?ids=${encodeURIComponent(idsKey)}`
      );
      const data = (await res.json()) as {
        summaries?: CycleLiveSummary[];
        error?: string;
      };
      if (!res.ok || cancelled) return;
      setSummaries(new Map((data.summaries ?? []).map((row) => [row.cycleId, row])));
    }

    void load();
    const id = window.setInterval(load, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [idsKey]);

  return summaries;
}

export function PmCycleListSections({ cycles }: { cycles: InvestmentCycle[] }) {
  const fundingCycles = cycles.filter((cycle) => FUNDING_STATUSES.has(cycle.status));
  const tradingCycles = cycles.filter((cycle) => TRADING_STATUSES.has(cycle.status));
  const tradingSummaries = useTradingSummaries(tradingCycles);

  return (
    <div className="space-y-8">
      <PmSectionCard
        title="Funding Cycles"
        description="Cycles currently raising capital"
      >
        {fundingCycles.length === 0 ? (
          <p className="text-sm text-[var(--id-text-muted)]">No funding cycles right now.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {fundingCycles.map((cycle) => (
              <FundingCycleCard key={cycle.id} cycle={cycle} />
            ))}
          </ul>
        )}
      </PmSectionCard>

      <PmSectionCard
        title="Trading Cycles"
        description="Cycles currently being traded"
      >
        {tradingCycles.length === 0 ? (
          <p className="text-sm text-[var(--id-text-muted)]">No trading cycles right now.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {tradingCycles.map((cycle) => (
              <TradingCycleCard
                key={cycle.id}
                cycle={cycle}
                summary={tradingSummaries.get(cycle.id)}
              />
            ))}
          </ul>
        )}
      </PmSectionCard>
    </div>
  );
}

function FundingCycleCard({ cycle }: { cycle: InvestmentCycle }) {
  const href = `${ROUTES.poolManagerInvestmentCycles}/${cycle.id}`;

  return (
    <li>
      <Link
        href={href}
        className={cn(
          pmCardClass,
          "block p-4 transition-colors hover:border-[var(--pm-accent-border)]"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium text-[var(--id-text)]">
              {cycle.name || `Cycle ${cycle.cycleNumber}`}
            </p>
            <p className="mt-0.5 text-xs text-[var(--id-text-muted)]">
              Cycle {cycle.cycleNumber}
            </p>
          </div>
          <PmStatusBadge label="Funding" status="funding" />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className={pmStatLabelClass}>Raised capital</dt>
            <dd className={cn("mt-1", pmStatValueClass, "text-base")}>
              {formatCurrency(cycle.raisedCapital)}
            </dd>
          </div>
          <div>
            <dt className={pmStatLabelClass}>Investors</dt>
            <dd className={cn("mt-1", pmStatValueClass, "text-base")}>{cycle.investorCount}</dd>
          </div>
        </dl>

        {cycle.targetCapital != null && cycle.targetCapital > 0 && (
          <div className="mt-4">
            <PmFundingProgress
              compact
              raised={cycle.raisedCapital}
              target={cycle.targetCapital}
              investorCount={cycle.investorCount}
            />
          </div>
        )}
      </Link>
    </li>
  );
}

function TradingCycleCard({
  cycle,
  summary,
}: {
  cycle: InvestmentCycle;
  summary?: CycleLiveSummary;
}) {
  const href = `${ROUTES.poolManagerInvestmentCycles}/${cycle.id}`;
  const profit = summary?.currentCycleProfit ?? cycle.currentCycleProfit;
  const capital = summary?.currentCapital ?? cycle.raisedCapital;
  const trades = summary?.tradesRecorded ?? 0;
  const totalCapital =
    cycle.targetCapital != null && cycle.targetCapital > 0
      ? cycle.targetCapital
      : capital;
  const profitTone =
    profit > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : profit < 0
        ? "text-red-600 dark:text-red-400"
        : undefined;

  return (
    <li>
      <Link
        href={href}
        className={cn(
          pmCardClass,
          "block p-4 transition-colors hover:border-[var(--pm-accent-border)]"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium text-[var(--id-text)]">
              Cycle {cycle.cycleNumber}
            </p>
            {cycle.name && cycle.name !== `Cycle ${cycle.cycleNumber}` && (
              <p className="mt-0.5 truncate text-xs text-[var(--id-text-muted)]">{cycle.name}</p>
            )}
          </div>
          <PmStatusBadge label="Trading" status="trading" />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className={pmStatLabelClass}>Capital Traded</dt>
            <dd className={cn("mt-1", pmStatValueClass, "text-base")}>
              {formatCurrency(capital)}
            </dd>
          </div>
          <div>
            <dt className={pmStatLabelClass}>Total Capital Under Management</dt>
            <dd className={cn("mt-1", pmStatValueClass, "text-base")}>
              {formatCurrency(totalCapital)}
            </dd>
          </div>
          <div>
            <dt className={pmStatLabelClass}>Investors</dt>
            <dd className={cn("mt-1", pmStatValueClass, "text-base")}>{cycle.investorCount}</dd>
          </div>
          <div>
            <dt className={pmStatLabelClass}>Current P/L</dt>
            <dd className={cn("mt-1", pmStatValueClass, "text-base", profitTone)}>
              {formatCurrency(profit)}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className={pmStatLabelClass}>Trades recorded</dt>
            <dd className={cn("mt-1", pmStatValueClass, "text-base")}>{trades}</dd>
          </div>
        </dl>
      </Link>
    </li>
  );
}

export function splitCyclesForSections(cycles: InvestmentCycle[]) {
  return {
    fundingCycles: cycles.filter((cycle) => FUNDING_STATUSES.has(cycle.status)),
    tradingCycles: cycles.filter((cycle) => TRADING_STATUSES.has(cycle.status)),
  };
}
