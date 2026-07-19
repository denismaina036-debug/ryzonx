"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { AutomationCenterShell, ProcessQueuesButton } from "./automation-center-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { PLATFORM_EVENT_CATEGORY_LABELS } from "@/constants/platform-events";
import type { AutomationCenterView } from "@/domain/platform-events/types";

export function AdminAutomationDashboard() {
  const [data, setData] = useState<AutomationCenterView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/automation");
      const json = (await res.json()) as { view?: AutomationCenterView; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setData(json.view ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AutomationCenterShell
      title="Automation Center"
      description="Event-driven automation, notification queues, webhooks, and delivery monitoring — the platform messaging backbone."
      actions={
        <>
          <ProcessQueuesButton onComplete={() => void load()} />
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </>
      }
    >
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Active rules" value={data?.activeRules ?? 0} />
        <MetricCard label="Pending notifications" value={data?.pendingNotifications ?? 0} warn={(data?.pendingNotifications ?? 0) > 0} />
        <MetricCard label="Failed notifications" value={data?.failedNotifications ?? 0} warn={(data?.failedNotifications ?? 0) > 0} />
        <MetricCard label="Pending webhooks" value={data?.pendingWebhooks ?? 0} />
        <MetricCard label="Failed webhooks" value={data?.failedWebhooks ?? 0} warn={(data?.failedWebhooks ?? 0) > 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Platform Events</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href={ROUTES.adminAutomationEvents}>View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.recentEvents ?? []).length === 0 && (
              <p className="text-sm text-navy-500">No events recorded yet.</p>
            )}
            {(data?.recentEvents ?? []).slice(0, 8).map((event) => (
              <div key={event.id} className="flex items-start justify-between gap-3 border-b border-border/60 py-2 last:border-0">
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-navy-800">{event.eventType}</p>
                  <p className="text-xs text-navy-500">
                    {PLATFORM_EVENT_CATEGORY_LABELS[event.category]} · {event.status}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-navy-400">
                  {new Date(event.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Notification Queue</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href={ROUTES.adminAutomationQueue}>Monitor</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.queueItems ?? []).length === 0 && (
              <p className="text-sm text-navy-500">Queue is empty.</p>
            )}
            {(data?.queueItems ?? []).slice(0, 8).map((item) => (
              <div key={item.id} className="flex justify-between gap-3 border-b border-border/60 py-2 text-sm last:border-0">
                <span className="truncate text-navy-800">{item.templateSlug}</span>
                <span className="shrink-0 text-navy-500">{item.status}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Failed Webhook Deliveries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(data?.failedDeliveries ?? []).length === 0 && (
            <p className="text-sm text-navy-500">No failed webhook deliveries.</p>
          )}
          {(data?.failedDeliveries ?? []).map((delivery) => (
            <div key={delivery.id} className="flex justify-between gap-3 text-sm">
              <span className="font-mono text-xs text-navy-700">{delivery.id.slice(0, 8)}…</span>
              <span className="text-rose-600">{delivery.errorMessage ?? "Failed"}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </AutomationCenterShell>
  );
}

function MetricCard({
  label,
  value,
  warn,
}: {
  label: string;
  value: number;
  warn?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        {warn ? (
          <AlertTriangle className="h-5 w-5 text-amber-600" />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        )}
        <div>
          <p className="text-xs text-navy-500">{label}</p>
          <p className="text-xl font-semibold text-navy-950">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
