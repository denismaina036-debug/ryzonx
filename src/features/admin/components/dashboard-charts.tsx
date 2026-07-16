"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PerformanceChart } from "@/components/ui/chart";
import type { AdminTrendPoint } from "@/features/admin/types";

interface AdminChartCardProps {
  title: string;
  data: AdminTrendPoint[];
  type?: "area" | "line" | "bar";
  color?: string;
  height?: number;
}

export function AdminChartCard({
  title,
  data,
  type = "area",
  color,
  height = 240,
}: AdminChartCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-navy-700">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <PerformanceChart
          data={data.map((d) => ({ date: d.date, value: d.value }))}
          type={type}
          color={color}
          height={height}
        />
      </CardContent>
    </Card>
  );
}

interface AdminDashboardChartsProps {
  poolGrowth: AdminTrendPoint[];
  deposits: AdminTrendPoint[];
  withdrawals: AdminTrendPoint[];
  investments: AdminTrendPoint[];
  dailyRoi: AdminTrendPoint[];
}

export function AdminDashboardCharts({
  poolGrowth,
  deposits,
  withdrawals,
  investments,
  dailyRoi,
}: AdminDashboardChartsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <AdminChartCard title="Pool Growth" data={poolGrowth} />
      <AdminChartCard title="Daily ROI Trend" data={dailyRoi} type="line" />
      <AdminChartCard title="Deposit Trends" data={deposits} type="bar" />
      <AdminChartCard title="Withdrawal Trends" data={withdrawals} type="bar" />
      <div className="lg:col-span-2">
        <AdminChartCard title="Investment Trends" data={investments} />
      </div>
    </div>
  );
}
