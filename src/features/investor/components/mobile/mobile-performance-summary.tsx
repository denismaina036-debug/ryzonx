"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  InvestorDashboardTrade,
  InvestorPoolPerformance,
} from "@/features/investor/types";

interface MobilePerformanceSummaryProps {
  performance: InvestorPoolPerformance;
  trades: InvestorDashboardTrade[];
}

const HEALTH_LABELS = {
  healthy: "Healthy",
  watch: "Watch",
  at_risk: "At Risk",
} as const;

export function MobilePerformanceSummary({
  performance,
  trades,
}: MobilePerformanceSummaryProps) {
  const todaysProfit = performance.dailyProfit ?? 0;
  const todayPositive = todaysProfit >= 0;
  const monthly = performance.totalProfitPct;
  const monthlyPositive = monthly >= 0;
  const openTrades = trades.filter((t) => t.isActive).length;
  const health = performance.poolHealth;

  return (
    <section className="rounded-2xl bg-[var(--id-surface)] p-4 shadow-[var(--id-shadow)]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--id-text)]">
          Performance Overview
        </h2>
        <Link
          href={ROUTES.investments}
          className="text-xs font-medium text-[var(--id-accent-text)] hover:underline"
        >
          View all
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2">
        <Metric
          label="Today's Profit"
          value={`${todayPositive ? "+" : ""}${formatCurrency(todaysProfit)}`}
          tone={todayPositive ? "success" : "danger"}
          icon={todayPositive ? TrendingUp : TrendingDown}
        />
        <Metric
          label="This Month"
          value={`${monthlyPositive ? "+" : ""}${monthly.toFixed(2)}%`}
          tone={monthlyPositive ? "success" : "danger"}
          icon={monthlyPositive ? TrendingUp : TrendingDown}
        />
        <Metric
          label="Open Trades"
          value={String(openTrades)}
          sub="Running"
          tone="neutral"
          icon={Activity}
        />
        <Metric
          label="Pool Status"
          value={health ? HEALTH_LABELS[health] : "—"}
          tone={health === "healthy" ? "success" : health === "at_risk" ? "danger" : "neutral"}
          icon={ShieldCheck}
        />
      </div>

      <Link
        href={ROUTES.investments}
        className="mt-4 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] text-xs font-semibold text-[var(--id-text)] transition-colors active:bg-[var(--id-surface-hover)]"
      >
        View Performance
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
      </Link>
    </section>
  );
}

function Metric({
  label,
  value,
  sub,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "success" | "danger" | "neutral";
  icon: typeof TrendingUp;
}) {
  const toneClass =
    tone === "success"
      ? "text-[var(--id-success)]"
      : tone === "danger"
        ? "text-[var(--id-danger)]"
        : "text-[var(--id-text)]";

  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] text-[var(--id-text-muted)]">{label}</p>
      <p
        className={cn(
          "mt-1 flex items-center gap-0.5 font-mono text-xs font-semibold tabular-nums",
          toneClass
        )}
      >
        <span className="truncate">{value}</span>
        <Icon className="h-3 w-3 shrink-0" strokeWidth={2} />
      </p>
      {sub && (
        <p className="mt-0.5 text-[10px] text-[var(--id-accent-text)]">{sub}</p>
      )}
    </div>
  );
}
