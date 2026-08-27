"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { AutomationCenterShell } from "./automation-center-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PLATFORM_EVENT_CATEGORY_LABELS } from "@/constants/platform-events";
import type { AutomationRule } from "@/domain/platform-events/types";
import type { CommunicationChannel } from "@/domain/communication/types";

const BROADCAST_CHANNELS: Array<{ value: CommunicationChannel; label: string }> = [
  { value: "telegram", label: "Telegram" },
  { value: "email", label: "Email" },
  { value: "in_app", label: "In-App" },
];

export function AdminAutomationRules() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/automation/rules");
      const json = (await res.json()) as { rules?: AutomationRule[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setRules(json.rules ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleRule(ruleId: string, current: AutomationRule["status"]) {
    setActionId(ruleId);
    try {
      const next = current === "active" ? "inactive" : "active";
      const res = await fetch(`/api/admin/automation/rules/${ruleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setActionId(null);
    }
  }

  async function toggleChannel(
    rule: AutomationRule,
    channel: CommunicationChannel,
    enabled: boolean
  ) {
    const action = rule.actions.find((candidate) => candidate.type === "broadcast_template");
    if (!action) return;
    const current = action.channels ?? ["telegram"];
    const channels = enabled
      ? [...new Set([...current, channel])]
      : current.filter((candidate) => candidate !== channel);

    setActionId(rule.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/automation/rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Channel update failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Channel update failed");
    } finally {
      setActionId(null);
    }
  }

  return (
    <AutomationCenterShell
      title="Automation Rules"
      description="Configurable event-driven rules — notifications and alerts react to platform events, not embedded business logic."
      actions={
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      }
    >
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Rules ({rules.filter((r) => r.status === "active").length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rules.map((rule) => {
            const broadcast = rule.actions.find((action) => action.type === "broadcast_template");
            const selectedChannels = broadcast?.channels ?? ["telegram"];
            return (
            <div key={rule.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-navy-900">{rule.name}</p>
                <p className="text-xs text-navy-500">
                  {rule.eventType} · {PLATFORM_EVENT_CATEGORY_LABELS[rule.category]} · priority {rule.priority}
                </p>
                {rule.description && <p className="mt-1 text-sm text-navy-600">{rule.description}</p>}
                {broadcast && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {BROADCAST_CHANNELS.map((channel) => (
                      <label
                        key={channel.value}
                        className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-navy-700"
                      >
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 accent-blue-600"
                          checked={selectedChannels.includes(channel.value)}
                          disabled={actionId === rule.id}
                          onChange={(event) => void toggleChannel(rule, channel.value, event.target.checked)}
                        />
                        {channel.label}
                      </label>
                    ))}
                    <span className="self-center text-xs text-navy-400">
                      Template: {broadcast.templateSlug}
                    </span>
                  </div>
                )}
              </div>
              <Button
                size="sm"
                variant={rule.status === "active" ? "default" : "outline"}
                disabled={actionId === rule.id}
                onClick={() => void toggleRule(rule.id, rule.status)}
              >
                {rule.status === "active" ? "Active" : "Inactive"}
              </Button>
            </div>
            );
          })}
        </CardContent>
      </Card>
    </AutomationCenterShell>
  );
}
