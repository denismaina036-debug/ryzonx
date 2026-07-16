import type { Metadata } from "next";
import { Target, TrendingUp, BarChart3, Calendar } from "lucide-react";
import { PageHeader } from "@/components/layouts/page-header";
import { SectionContainer } from "@/components/layouts/section";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { PerformanceSection } from "@/features/public/components/performance-section";
import { fundService } from "@/services/fund.service";
import { mockPerformanceHistory } from "@/lib/mock-data";
import { formatPercentage } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Performance",
  description: "View Ryvonx's historical performance, ROI metrics, and fund statistics.",
};

export default async function PerformancePage() {
  const summary = await fundService.getPerformanceSummary();

  return (
    <>
      <SectionContainer className="!pb-8 !pt-8">
        <PageHeader
          title="Fund Performance"
          description="Complete transparency into Ryvonx Main Pool performance metrics and historical data."
        />
        <StatGrid columns={4}>
          <StatCard
            label="Daily ROI"
            value={formatPercentage(summary.dailyRoi)}
            changeType={summary.dailyRoi >= 0 ? "positive" : "negative"}
            icon={TrendingUp}
          />
          <StatCard
            label="Weekly ROI"
            value={formatPercentage(summary.weeklyRoi)}
            changeType={summary.weeklyRoi >= 0 ? "positive" : "negative"}
            icon={BarChart3}
          />
          <StatCard
            label="Monthly ROI"
            value={formatPercentage(summary.monthlyRoi)}
            changeType={summary.monthlyRoi >= 0 ? "positive" : "negative"}
            icon={Calendar}
          />
          <StatCard
            label="Yearly ROI"
            value={formatPercentage(summary.yearlyRoi)}
            changeType={summary.yearlyRoi >= 0 ? "positive" : "negative"}
            icon={Target}
          />
        </StatGrid>
      </SectionContainer>

      <PerformanceSection allData={mockPerformanceHistory} className="!pt-0" />

      <SectionContainer>
        <StatGrid columns={4}>
          <StatCard
            label="Win Rate"
            value={`${summary.winRate}%`}
            icon={Target}
          />
          <StatCard
            label="Avg Trade ROI"
            value={formatPercentage(summary.averageTradeRoi)}
            changeType="positive"
            icon={TrendingUp}
          />
          <StatCard
            label="Best Month"
            value={formatPercentage(summary.bestMonth.roi)}
            change={`${summary.bestMonth.month}`}
            changeType="positive"
            icon={BarChart3}
          />
          <StatCard
            label="Worst Month"
            value={formatPercentage(summary.worstMonth.roi)}
            change={`${summary.worstMonth.month}`}
            changeType="negative"
            icon={BarChart3}
          />
        </StatGrid>
      </SectionContainer>
    </>
  );
}
