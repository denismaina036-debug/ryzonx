"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { AutomationCenterShell } from "./automation-center-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WebhookRegistration } from "@/domain/platform-events/types";

export function AdminWebhookManagement() {
  const [webhooks, setWebhooks] = useState<WebhookRegistration[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [pattern, setPattern] = useState("*");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/automation/webhooks");
      const json = (await res.json()) as { webhooks?: WebhookRegistration[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setWebhooks(json.webhooks ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function register() {
    if (!name.trim() || !url.trim()) {
      setError("Name and URL are required.");
      return;
    }
    setError(null);
    try {
      const res = await fetch("/api/admin/automation/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url, eventTypePattern: pattern }),
      });
      const json = (await res.json()) as { webhook?: WebhookRegistration; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Registration failed");
      setCreatedSecret(json.webhook?.secret ?? null);
      setName("");
      setUrl("");
      setPattern("*");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  }

  async function toggle(webhookId: string, isActive: boolean) {
    const res = await fetch(`/api/admin/automation/webhooks/${webhookId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      setError(json.error ?? "Toggle failed");
      return;
    }
    await load();
  }

  return (
    <AutomationCenterShell
      title="Webhook Management"
      description="Register outbound webhooks with HMAC signatures, retry status, and delivery history."
      actions={
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      }
    >
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {createdSecret && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Webhook registered. Secret (save now): <code className="font-mono">{createdSecret}</code>
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Register Webhook</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="URL" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Input placeholder="Event pattern (e.g. allocation.*)" value={pattern} onChange={(e) => setPattern(e.target.value)} />
          <Button onClick={() => void register()}>Register</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registrations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {webhooks.length === 0 && <p className="text-sm text-navy-500">No webhooks registered.</p>}
          {webhooks.map((wh) => (
            <div key={wh.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <p className="font-medium text-navy-900">{wh.name}</p>
                <p className="text-xs text-navy-500">{wh.url}</p>
                <p className="text-xs text-navy-400">Pattern: {wh.eventTypePattern}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => void toggle(wh.id, wh.isActive)}>
                {wh.isActive ? "Active" : "Inactive"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </AutomationCenterShell>
  );
}
