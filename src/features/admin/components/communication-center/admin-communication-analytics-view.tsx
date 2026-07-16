"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Clock, Mail, RefreshCw, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AnalyticsData {
  emailsSentToday: number;
  emailsDelivered: number;
  emailsFailed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  supportResponseTimeHours: number;
  topTemplates: Array<{ slug: string; count: number }>;
  dailyActivity: Array<{ date: string; count: number }>;
  monthlyTrend: Array<{ date: string; count: number }>;
}

export function AdminCommunicationAnalyticsView({
  initialData,
}: {
  initialData: AnalyticsData | null;
}) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/communication/analytics");
      const json = await res.json();
      if (res.ok) setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (!data) {
    return <p className="text-sm text-navy-500">Unable to load analytics.</p>;
  }

  const metrics = [
    { label: "Emails sent today", value: data.emailsSentToday, icon: Mail },
    { label: "Delivery rate", value: `${data.deliveryRate}%`, icon: TrendingUp },
    { label: "Open rate", value: `${data.openRate}%`, icon: BarChart3 },
    { label: "Click rate", value: `${data.clickRate}%`, icon: TrendingUp },
    { label: "Bounce rate", value: `${data.bounceRate}%`, icon: Mail },
    { label: "Failed deliveries", value: data.emailsFailed, icon: Mail },
    { label: "Avg resolution", value: `${data.supportResponseTimeHours}h`, icon: Clock },
  ];

  return (
    <div className="space-y-6">
      <Button type="button" size="sm" variant="outline" disabled={loading} onClick={refresh}>
        <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} />
        Refresh
      </Button>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">{m.label}</p>
              <m.icon className="h-4 w-4 text-royal-500" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-navy-900">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-navy-800">Most used templates</h3>
          <ul className="mt-4 space-y-2">
            {data.topTemplates.map((t) => (
              <li key={t.slug} className="flex justify-between rounded-lg bg-navy-50 px-3 py-2 text-sm">
                <span className="font-mono text-xs">{t.slug}</span>
                <span className="font-semibold text-royal-600">{t.count}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-navy-800">Daily activity trend</h3>
          <div className="mt-4 flex h-40 items-end gap-1">
            {data.dailyActivity.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-royal-500"
                  style={{ height: `${Math.max(10, Math.min(100, d.count * 10))}%` }}
                />
                <span className="text-[10px] text-navy-400">{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
