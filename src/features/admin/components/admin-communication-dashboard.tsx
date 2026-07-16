"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  Mail,
  AlertTriangle,
  Clock,
  Activity,
  Inbox,
  Megaphone,
  Radio,
  Bell,
  TrendingUp,
  MousePointerClick,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import type { EnterpriseDashboardStats } from "@/services/communication/communication-center.service";

export function AdminCommunicationDashboard({
  initialStats,
}: {
  initialStats: EnterpriseDashboardStats | null;
}) {
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/communication/dashboard");
      const data = await res.json();
      if (res.ok) setStats(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function processQueue() {
    setProcessing(true);
    try {
      await fetch("/api/admin/communication/process-queue", { method: "POST" });
      await refresh();
    } finally {
      setProcessing(false);
    }
  }

  if (!stats) {
    return <p className="text-sm text-navy-500">Unable to load communication dashboard.</p>;
  }

  const primaryCards = [
    { label: "Emails sent today", value: stats.emailsSentToday, icon: Mail },
    { label: "Delivered", value: stats.emailsDelivered, icon: Send },
    { label: "Failed", value: stats.emailsFailed, icon: AlertTriangle },
    { label: "Queued", value: stats.queuedEmails, icon: Clock },
  ];

  const secondaryCards = [
    { label: "Unread support", value: stats.unreadSupportTickets, icon: Inbox },
    { label: "Broadcasts running", value: stats.broadcastsRunning, icon: Radio },
    { label: "Announcements live", value: stats.announcementsPublished, icon: Megaphone },
    { label: "Notifications today", value: stats.notificationsSentToday, icon: Bell },
  ];

  const rateCards = [
    { label: "Delivery rate", value: `${stats.deliveryRate}%`, icon: TrendingUp },
    { label: "Open rate", value: `${stats.openRate}%`, icon: Mail },
    { label: "Click rate", value: `${stats.clickRate}%`, icon: MousePointerClick },
    { label: "Bounce rate", value: `${stats.bounceRate}%`, icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={loading} onClick={refresh}>
          <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
        <Button type="button" size="sm" disabled={processing} onClick={processQueue}>
          Process email queue
        </Button>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href={ROUTES.adminCommunicationInbox}>Inbox</Link>
        </Button>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href={ROUTES.adminCommunicationAnalytics}>Analytics</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {primaryCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">{card.label}</p>
              <card.icon className="h-4 w-4 text-royal-500" />
            </div>
            <p className="mt-3 text-3xl font-semibold text-navy-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {secondaryCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-navy-50/50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">{card.label}</p>
              <card.icon className="h-4 w-4 text-navy-500" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-navy-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {rateCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-royal-100 bg-gradient-to-br from-white to-royal-50/40 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-royal-600">{card.label}</p>
              <card.icon className="h-4 w-4 text-royal-500" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-navy-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-xl border border-border bg-card p-5 xl:col-span-1">
          <h3 className="text-sm font-semibold text-navy-800">Top email templates</h3>
          <ul className="mt-4 space-y-2">
            {stats.topTemplates.length === 0 ? (
              <li className="text-xs text-navy-400">No template usage yet.</li>
            ) : (
              stats.topTemplates.map((t) => (
                <li key={t.slug} className="flex items-center justify-between rounded-lg bg-navy-50 px-3 py-2 text-xs">
                  <span className="font-mono text-navy-700">{t.slug}</span>
                  <span className="font-semibold text-royal-600">{t.count}</span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 xl:col-span-1">
          <h3 className="text-sm font-semibold text-navy-800">Daily activity (7 days)</h3>
          <div className="mt-4 flex h-32 items-end gap-1">
            {stats.dailyActivity.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-royal-500/80"
                  style={{ height: `${Math.max(8, Math.min(100, d.count * 8))}%` }}
                />
                <span className="text-[10px] text-navy-400">{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 xl:col-span-1">
          <h3 className="text-sm font-semibold text-navy-800">Failed deliveries</h3>
          <ul className="mt-4 max-h-40 space-y-2 overflow-y-auto">
            {stats.failedDeliveries.length === 0 ? (
              <li className="text-xs text-navy-400">No failed deliveries.</li>
            ) : (
              stats.failedDeliveries.slice(0, 6).map((row) => (
                <li key={String(row.id)} className="rounded-lg bg-red-50 px-3 py-2 text-xs">
                  <p className="font-medium text-navy-800">
                    {String(row.channel)} · {String(row.error_message ?? "Failed")}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-navy-800">Recent communication activity</h3>
        <ul className="mt-4 grid gap-2 md:grid-cols-2">
          {stats.recentActivity.slice(0, 12).map((row) => (
            <li key={String(row.id)} className="rounded-lg bg-navy-50 px-3 py-2 text-xs">
              <p className="font-medium text-navy-800">
                {String(row.template_slug ?? "communication")} · {String(row.status)}
              </p>
              <p className="text-navy-500">{String(row.rendered_subject ?? "—")}</p>
              <p className="text-navy-400">{new Date(String(row.created_at)).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
