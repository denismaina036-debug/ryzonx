"use client";

import { useCallback, useState } from "react";
import { Copy, Plus, Radio, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BROADCAST_AUDIENCES } from "@/constants/communication-center";
import { cn } from "@/lib/utils";
import type { BroadcastRecord } from "@/services/communication/broadcast-center.service";

export function AdminCommunicationBroadcastsView({
  initialBroadcasts,
}: {
  initialBroadcasts: BroadcastRecord[];
}) {
  const [items, setItems] = useState(initialBroadcasts);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [audience, setAudience] = useState("everyone");
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/communication/broadcasts");
    const data = await res.json();
    if (res.ok) setItems(data.broadcasts ?? []);
  }, []);

  async function createBroadcast() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/communication/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          audienceFilter: { audience },
          scheduledAt: scheduledAt || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Create failed");
      toast.success(scheduledAt ? "Broadcast scheduled" : "Draft saved");
      setName("");
      setScheduledAt("");
      setShowForm(false);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function duplicate(id: string) {
    const res = await fetch(`/api/admin/communication/broadcasts/${id}/duplicate`, { method: "POST" });
    if (res.ok) {
      toast.success("Duplicated");
      await refresh();
    }
  }

  const statusStyle: Record<string, string> = {
    draft: "bg-navy-100 text-navy-600",
    queued: "bg-amber-100 text-amber-700",
    sending: "bg-royal-100 text-royal-700",
    completed: "bg-emerald-100 text-emerald-700",
    failed: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> New broadcast
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={refresh}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Broadcast name" />
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          >
            {BROADCAST_AUDIENCES.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
          <Input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            placeholder="Schedule (optional)"
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={saving} onClick={createBroadcast}>
              {scheduledAt ? "Schedule" : "Save draft"}
            </Button>
            <Button type="button" size="sm" variant="outline">Preview</Button>
            <Button type="button" size="sm" variant="outline">Test send</Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-navy-400">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Template</th>
              <th className="px-4 py-3">Audience</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Scheduled</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id} className="border-b border-border/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-royal-500" />
                    <span className="font-medium">{b.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{b.templateSlug ?? "—"}</td>
                <td className="px-4 py-3 capitalize">
                  {String((b.audienceFilter as { audience?: string }).audience ?? "everyone").replace(/_/g, " ")}
                </td>
                <td className="px-4 py-3">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", statusStyle[b.status] ?? statusStyle.draft)}>
                    {b.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-navy-500">
                  {b.scheduledAt ? new Date(b.scheduledAt).toLocaleString() : "Immediate"}
                </td>
                <td className="px-4 py-3">
                  <Button type="button" size="sm" variant="ghost" onClick={() => duplicate(b.id)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
