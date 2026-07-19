"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { ChallengeStatistics } from "@/domain/challenge/types";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

interface StatProps {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative" | "muted";
}

function Stat({ label, value, tone = "default" }: StatProps) {
  return (
    <div className="rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--id-text-muted)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-xl font-semibold tabular-nums",
          tone === "positive" && "text-emerald-400",
          tone === "negative" && "text-rose-400",
          tone === "muted" && "text-[var(--id-text-secondary)]",
          tone === "default" && "text-[var(--id-text)]"
        )}
      >
        {value}
      </p>
    </div>
  );
}

interface ChallengeDashboardProps {
  statistics: ChallengeStatistics;
  displayStatus: string;
}

export function ChallengeDashboard({ statistics, displayStatus }: ChallengeDashboardProps) {
  const profitTone = useMemo(() => {
    if (statistics.currentProfit > 0) return "positive" as const;
    if (statistics.currentProfit < 0) return "negative" as const;
    return "default" as const;
  }, [statistics.currentProfit]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--id-text-muted)]">
            Challenge Progress
          </p>
          <p className="mt-1 text-2xl font-semibold capitalize text-[var(--id-text)]">
            {displayStatus.replace("_", " ")}
          </p>
        </div>
        <div className="min-w-[12rem] flex-1 sm:max-w-md">
          <div className="flex items-center justify-between text-xs text-[var(--id-text-muted)]">
            <span>Progress</span>
            <span>{formatPct(statistics.progressPct)}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--id-surface-elevated)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--id-accent)] to-violet-400 transition-all"
              style={{ width: `${statistics.progressPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Current Profit" value={formatCurrency(statistics.currentProfit)} tone={profitTone} />
        <Stat
          label="Remaining Target"
          value={formatCurrency(statistics.remainingProfitTarget)}
        />
        <Stat label="Current Balance" value={formatCurrency(statistics.currentBalance)} />
        <Stat label="Max Drawdown" value={formatPct(statistics.maxDrawdownPct)} tone="muted" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Trading Days" value={String(statistics.tradingDays)} />
        <Stat label="Current Day" value={String(statistics.currentTradingDay)} />
        <Stat label="Days Remaining" value={String(statistics.remainingDays)} />
        <Stat label="Win Rate" value={formatPct(statistics.winRate)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Trades Submitted" value={String(statistics.tradesSubmitted)} />
        <Stat label="Approved" value={String(statistics.tradesApproved)} tone="positive" />
        <Stat label="Rejected" value={String(statistics.tradesRejected)} tone="negative" />
        <Stat label="Pending Review" value={String(statistics.tradesPending)} tone="muted" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Winning Trades" value={String(statistics.winningTrades)} tone="positive" />
        <Stat label="Losing Trades" value={String(statistics.losingTrades)} tone="negative" />
        <Stat label="Average Win" value={formatCurrency(statistics.averageWin)} />
        <Stat label="Average Loss" value={formatCurrency(statistics.averageLoss)} />
      </div>
    </div>
  );
}
