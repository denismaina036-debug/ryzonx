"use client";

import Link from "next/link";
import { RefreshCw, Mail, Megaphone, Bell, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import type { OperationalDashboardStats } from "@/services/communication/communication-center.service";

export function AdminCommunicationDashboard({
  initialStats,
}: {
  initialStats: OperationalDashboardStats | null;
}) {
  const stats = initialStats;

  if (!stats) {
    return <p className="text-sm text-navy-500">Unable to load communication overview.</p>;
  }

  const metricCards = [
    { label: "Messages sent", value: stats.messagesSent, icon: Mail, href: ROUTES.adminCommunicationMessages },
    {
      label: "Campaigns pending review",
      value: stats.campaignsPendingReview,
      icon: Megaphone,
      href: ROUTES.adminCommunicationCampaigns,
    },
    {
      label: "Notifications sent",
      value: stats.notificationsSent,
      icon: Bell,
      href: ROUTES.adminCommunicationNotifications,
    },
    {
      label: "Failed notifications",
      value: stats.failedNotifications,
      icon: AlertTriangle,
      href: ROUTES.adminCommunicationNotifications,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-royal-200 hover:bg-royal-50/20"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                {card.label}
              </p>
              <card.icon className="h-4 w-4 text-royal-500" />
            </div>
            <p className="mt-3 text-3xl font-semibold text-navy-900">{card.value}</p>
          </Link>
        ))}
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-navy-800">Recent activity</h2>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href={ROUTES.adminCommunicationMessages}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              View messages
            </Link>
          </Button>
        </div>
        {stats.recentActivity.length === 0 ? (
          <p className="mt-4 text-sm text-navy-500">No recent communication activity.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {stats.recentActivity.map((item) => (
              <li key={item.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-navy-900">
                    {item.subject ?? item.templateSlug ?? "Communication"}
                  </p>
                  <p className="text-xs text-navy-500">
                    {item.templateSlug ?? "message"} · {item.status}
                  </p>
                </div>
                <p className={cn("text-xs text-navy-400")}>
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
