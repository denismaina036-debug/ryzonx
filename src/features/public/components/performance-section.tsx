"use client";

import { useState, useMemo } from "react";
import { PerformanceChart } from "@/components/ui/chart";
import { PeriodSelector } from "@/components/ui/period-selector";
import { SectionContainer, SectionHeader } from "@/components/layouts/section";
import type { PerformanceSnapshot, PerformancePeriod } from "@/types";

interface PerformanceSectionProps {
  allData: PerformanceSnapshot[];
  showHeader?: boolean;
  className?: string;
}

function filterByPeriod(
  data: PerformanceSnapshot[],
  period: PerformancePeriod
): PerformanceSnapshot[] {
  switch (period) {
    case "daily":
      return data.slice(-30);
    case "weekly":
      return data.filter((_, i) => i % 7 === 0).slice(-52);
    case "monthly":
      return data.filter((_, i) => i % 30 === 0).slice(-12);
    case "yearly":
      return data.filter((_, i) => i % 90 === 0).slice(-5);
    default:
      return data.slice(-30);
  }
}

export function PerformanceSection({
  allData,
  showHeader = true,
  className,
}: PerformanceSectionProps) {
  const [period, setPeriod] = useState<PerformancePeriod>("monthly");

  const filtered = useMemo(
    () => filterByPeriod(allData, period),
    [allData, period]
  );

  const chartData = filtered.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: period === "daily" ? "numeric" : undefined,
      year: period === "yearly" ? "numeric" : undefined,
    }),
    value: d.poolValue,
    roi: d.cumulativeRoi,
  }));

  const latestValue = chartData[chartData.length - 1]?.value ?? 0;

  return (
    <SectionContainer className={className ?? "bg-surface-1"}>
      {showHeader && (
        <SectionHeader
          badge="Performance"
          title="Pool Performance History"
          description="Track the fund's growth over time. All data is updated in real-time and fully transparent."
          align="center"
        />
      )}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-navy-500">Pool Value</p>
            <p className="font-mono text-2xl font-semibold text-navy-950">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
              }).format(latestValue)}
            </p>
          </div>
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
        <PerformanceChart data={chartData} type="area" height={360} />
      </div>
    </SectionContainer>
  );
}
