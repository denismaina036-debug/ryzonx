"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { AutomationCenterShell } from "./automation-center-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PLATFORM_EVENT_CATEGORY_LABELS } from "@/constants/platform-events";
import type { PlatformEvent } from "@/domain/platform-events/types";

export function AdminEventExplorer() {
  const [events, setEvents] = useState<PlatformEvent[]>([]);
  const [eventType, setEventType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (eventType.trim()) params.set("eventType", eventType.trim());
      params.set("limit", "50");
      const res = await fetch(`/api/admin/automation/events?${params.toString()}`);
      const json = (await res.json()) as { events?: PlatformEvent[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setEvents(json.events ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [eventType]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AutomationCenterShell
      title="Event Explorer"
      description="Browse the platform event store — every major business action publishes a traceable event."
      actions={
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      }
    >
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex max-w-md gap-2">
        <Input
          placeholder="Filter by event type…"
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
        />
        <Button onClick={() => void load()}>Filter</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-navy-500">
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Category</th>
                  <th className="pb-2 pr-4">Entity</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b border-border/60">
                    <td className="py-2 pr-4 font-mono text-xs">{event.eventType}</td>
                    <td className="py-2 pr-4">{PLATFORM_EVENT_CATEGORY_LABELS[event.category]}</td>
                    <td className="py-2 pr-4 text-xs text-navy-600">
                      {event.entityType ?? "—"}
                      {event.entityId ? ` · ${event.entityId.slice(0, 8)}…` : ""}
                    </td>
                    <td className="py-2 pr-4">{event.status}</td>
                    <td className="py-2 text-xs text-navy-500">
                      {new Date(event.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {events.length === 0 && !loading && (
              <p className="py-6 text-center text-sm text-navy-500">No events found.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </AutomationCenterShell>
  );
}
