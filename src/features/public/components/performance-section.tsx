"use client";

import { useState, useMemo } from "react";
import { PerformanceChart } from "@/components/ui/chart";
import { PeriodSelector } from "@/components/ui/period-selector";
import { SectionContainer, SectionHeader } from "@/components/layouts/section";
import { useOptionalLandingContent } from "@/providers/landing-content-provider";
import { DEFAULT_LANDING_PAGE_CONTENT } from "@/domain/landing-page/defaults";
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
  const landing = useOptionalLandingContent();
  const copy = landing?.copy.performance ?? DEFAULT_LANDING_PAGE_CONTENT.copy.performance;
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
    <SectionContainer className={className ?? "bg-surface-1"} landingMobile>
      {showHeader && (
        <SectionHeader
          badge={copy.badge}
          title={copy.title}
          description={copy.description}
          align="center"
          compactMobile
        />
      )}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm md:p-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:mb-6 md:gap-4">
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
        <div className="md:hidden">
          <PerformanceChart data={chartData} type="area" height={300} />
        </div>
        <div className="hidden md:block">
          <PerformanceChart data={chartData} type="area" height={360} />
        </div>
      </div>
    </SectionContainer>
  );
}
