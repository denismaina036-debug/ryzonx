"use client";

import { useCallback, useState } from "react";
import { Plus, RefreshCw, Target } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { BroadcastRecord } from "@/services/communication/broadcast-center.service";

const CAMPAIGN_TYPES = [
  { id: "newsletter", label: "Monthly Newsletter" },
  { id: "investment_tips", label: "Investment Tips" },
  { id: "pool_reports", label: "Pool Performance Reports" },
  { id: "education", label: "Educational Content" },
  { id: "community", label: "Community Updates" },
  { id: "marketing", label: "Marketing Promotions" },
];

export function AdminCommunicationCampaignsView({
  initialCampaigns,
}: {
  initialCampaigns: BroadcastRecord[];
}) {
  const [items, setItems] = useState(initialCampaigns);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("newsletter");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/communication/campaigns");
    const data = await res.json();
    if (res.ok) setItems(data.campaigns ?? []);
  }, []);

  async function createCampaign() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/communication/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, campaignType: type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Create failed");
      toast.success("Campaign created");
      setName("");
      setShowForm(false);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-dashed border-royal-200 bg-royal-50/30 p-5">
        <p className="text-sm text-navy-600">
          Campaigns use the broadcast infrastructure with scheduling, audience selection, templates, and analytics.
          Future automation hooks will connect here.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> New campaign
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={refresh}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign name" />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          >
            {CAMPAIGN_TYPES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          <Button type="button" size="sm" disabled={saving} onClick={createCampaign}>
            Create campaign
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((c) => (
          <article key={c.id} className="rounded-xl border border-border bg-card p-5">
            <Target className="h-5 w-5 text-royal-500" />
            <h3 className="mt-3 font-semibold text-navy-900">{c.name}</h3>
            <p className="mt-1 text-xs capitalize text-navy-400">
              {String((c.audienceFilter as { campaignType?: string }).campaignType ?? c.category).replace(/_/g, " ")}
            </p>
            <span className={cn("mt-3 inline-block rounded-full bg-navy-100 px-2 py-0.5 text-xs font-semibold text-navy-600")}>
              {c.status}
            </span>
          </article>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-navy-400 md:col-span-2">No campaigns yet. Create one to get started.</p>
        )}
      </div>
    </div>
  );
}
