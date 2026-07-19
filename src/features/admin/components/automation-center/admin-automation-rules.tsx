"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { AutomationCenterShell } from "./automation-center-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PLATFORM_EVENT_CATEGORY_LABELS } from "@/constants/platform-events";
import type { AutomationRule } from "@/domain/platform-events/types";

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
          {rules.map((rule) => (
            <div key={rule.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0">
                <p className="font-medium text-navy-900">{rule.name}</p>
                <p className="text-xs text-navy-500">
                  {rule.eventType} · {PLATFORM_EVENT_CATEGORY_LABELS[rule.category]} · priority {rule.priority}
                </p>
                {rule.description && <p className="mt-1 text-sm text-navy-600">{rule.description}</p>}
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
          ))}
        </CardContent>
      </Card>
    </AutomationCenterShell>
  );
}
