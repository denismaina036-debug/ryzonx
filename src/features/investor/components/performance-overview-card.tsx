"use client";

import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronDown } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import {
  DashboardCard,
  DashboardStatTile,
  dashboardCardBodyClass,
} from "@/features/investor/components/dashboard-card";
import type { InvestorPoolPerformance } from "@/features/investor/types";

interface PerformanceOverviewCardProps {
  performance: InvestorPoolPerformance;
}

const PERIOD_OPTIONS = ["This Month", "This Week", "This Year"] as const;

function buildChartData(totalProfit: number) {
  if (totalProfit === 0) {
    return [
      { label: "Start", value: 0 },
      { label: "Now", value: 0 },
    ];
  }
  const base = Math.max(totalProfit - Math.abs(totalProfit) * 0.4, 0);
  const labels = ["Week 1", "Week 2", "Week 3", "Week 4", "Now"];
  const steps = [0.55, 0.68, 0.82, 0.94, 1];
  return labels.map((label, i) => ({
    label,
    value: Math.round(base + totalProfit * steps[i]!),
  }));
}

function metricOrDash(
  value: number | null | undefined,
  format: (n: number) => string
): string {
  if (value == null) return "—";
  return format(value);
}

export function PerformanceOverviewCard({
  performance,
}: PerformanceOverviewCardProps) {
  const [period, setPeriod] = useState<(typeof PERIOD_OPTIONS)[number]>("This Month");
  const chartData = buildChartData(performance.totalProfit);
  const profitPositive = performance.totalProfit >= 0;
  const hasActivity = performance.myInvestment != null && performance.myInvestment > 0;

  return (
    <DashboardCard
      title="Performance Overview"
      headerAction={
        <div className="relative">
          <select
            value={period}
            onChange={(e) =>
              setPeriod(e.target.value as (typeof PERIOD_OPTIONS)[number])
            }
            className="appearance-none rounded-lg border border-[var(--id-border)] bg-[var(--id-surface-muted)] py-1 pl-2.5 pr-7 text-xs font-medium text-[var(--id-text-secondary)] outline-none"
            aria-label="Performance period"
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--id-text-faint)]" />
        </div>
      }
    >
      <div className={dashboardCardBodyClass}>
        <p
          className={`font-mono text-xl font-semibold tabular-nums ${
            !hasActivity
              ? "text-[var(--id-text)]"
              : profitPositive
                ? "text-[var(--id-success)]"
                : "text-[var(--id-danger)]"
          }`}
        >
          {profitPositive && hasActivity ? "+" : ""}
          {formatCurrency(performance.totalProfit)}{" "}
          <span className="text-base">
            ({formatPercentage(performance.totalProfitPct)})
          </span>
        </p>
        <p className="mt-1 text-xs text-[var(--id-text-muted)]">Total Return</p>

        <div className="mt-5 h-[160px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="perfFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--id-accent)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--id-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--id-text-faint)", fontSize: 10 }}
              />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{
                  background: "var(--id-surface-elevated)",
                  border: "1px solid var(--id-border)",
                  borderRadius: 10,
                  boxShadow: "var(--id-shadow)",
                  fontSize: 11,
                }}
                formatter={(value: number) => [formatCurrency(value), "Value"]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--id-accent)"
                strokeWidth={2}
                fill="url(#perfFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-5">
          <DashboardStatTile
            label="Total Return"
            value={`${profitPositive && hasActivity ? "+" : ""}${formatCurrency(performance.totalProfit)}`}
            valueClassName={
              !hasActivity
                ? undefined
                : profitPositive
                  ? "text-[var(--id-success)]"
                  : "text-[var(--id-danger)]"
            }
          />
          <DashboardStatTile
            label="Best Day"
            value={metricOrDash(performance.bestDayProfit, (n) => `+${formatCurrency(n)}`)}
            valueClassName={
              performance.bestDayProfit != null ? "text-[var(--id-success)]" : undefined
            }
          />
          <DashboardStatTile
            label="Win Rate"
            value={metricOrDash(performance.winRate, (n) => `${n.toFixed(1)}%`)}
          />
          <DashboardStatTile
            label="Profit Factor"
            value={metricOrDash(performance.profitFactor, (n) => n.toFixed(2))}
          />
          <DashboardStatTile
            label="Max Drawdown"
            value={metricOrDash(performance.maxDrawdownPct, (n) => `${n.toFixed(2)}%`)}
            valueClassName={
              performance.maxDrawdownPct != null ? "text-[var(--id-danger)]" : undefined
            }
          />
        </div>
      </div>
    </DashboardCard>
  );
}
