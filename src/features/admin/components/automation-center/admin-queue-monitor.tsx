"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { AutomationCenterShell, ProcessQueuesButton } from "./automation-center-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { NotificationQueueItem, WebhookDelivery } from "@/domain/platform-events/types";

export function AdminQueueMonitor() {
  const [queue, setQueue] = useState<NotificationQueueItem[]>([]);
  const [failedWebhooks, setFailedWebhooks] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/automation/queue");
      const json = (await res.json()) as {
        queue?: NotificationQueueItem[];
        failedWebhooks?: WebhookDelivery[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setQueue(json.queue ?? []);
      setFailedWebhooks(json.failedWebhooks ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function retry(queueId: string) {
    setActionId(queueId);
    try {
      const res = await fetch(`/api/admin/automation/queue/${queueId}/retry`, { method: "POST" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Retry failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setActionId(null);
    }
  }

  return (
    <AutomationCenterShell
      title="Queue Monitor"
      description="Monitor notification queue processing, retry failed deliveries, and inspect webhook failures."
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification Queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {queue.length === 0 && <p className="text-sm text-navy-500">No pending or failed queue items.</p>}
          {queue.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <p className="font-medium text-navy-900">{item.templateSlug}</p>
                <p className="text-xs text-navy-500">
                  {item.status} · {item.channels.join(", ")}
                  {item.errorMessage ? ` · ${item.errorMessage}` : ""}
                </p>
              </div>
              {item.status === "failed" && (
                <Button size="sm" variant="outline" disabled={actionId === item.id} onClick={() => void retry(item.id)}>
                  Retry
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Failed Webhook Deliveries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {failedWebhooks.length === 0 && <p className="text-sm text-navy-500">No failed webhook deliveries.</p>}
          {failedWebhooks.map((d) => (
            <div key={d.id} className="flex justify-between gap-3 text-sm">
              <span className="font-mono text-xs">{d.id.slice(0, 8)}…</span>
              <span className="text-rose-600">{d.errorMessage ?? "Failed"}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </AutomationCenterShell>
  );
}
