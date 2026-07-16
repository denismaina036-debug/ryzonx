"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SECURITY_RATING_LABELS,
  AGGRESSIVENESS_LABELS,
  POOL_HEALTH_LABELS,
  CAPACITY_STATUS_LABELS,
} from "@/constants/marketplace";

export interface MarketplaceAdminFields {
  isMarketplaceListed: boolean;
  featured: boolean;
  tagline: string;
  categories: string;
  securityRating: string;
  aggressivenessLevel: string;
  poolHealth: string;
  capacityStatus: string;
  ryvonxRating: string;
  suggestedInvestment: string;
  riskSummary: string;
  adminComments: string;
  coverImageUrl: string;
  logoUrl: string;
  lifecycleStatus: string;
  maxAum: string;
  maxInvestorsCap: string;
}

export function AdminMarketplacePanel({
  fundId,
  initial,
}: {
  fundId: string;
  initial: MarketplaceAdminFields;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/pools/${fundId}/marketplace`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isMarketplaceListed: form.isMarketplaceListed,
          featured: form.featured,
          tagline: form.tagline,
          categories: form.categories.split(",").map((s) => s.trim()).filter(Boolean),
          securityRating: form.securityRating || null,
          aggressivenessLevel: form.aggressivenessLevel || null,
          poolHealth: form.poolHealth,
          capacityStatus: form.capacityStatus,
          ryvonxRating: form.ryvonxRating ? Number(form.ryvonxRating) : null,
          suggestedInvestment: form.suggestedInvestment
            ? Number(form.suggestedInvestment)
            : null,
          riskSummary: form.riskSummary,
          adminComments: form.adminComments,
          coverImageUrl: form.coverImageUrl || null,
          logoUrl: form.logoUrl || null,
          lifecycleStatus: form.lifecycleStatus,
          maxAum: form.maxAum ? Number(form.maxAum) : null,
          maxInvestorsCap: form.maxInvestorsCap ? Number(form.maxInvestorsCap) : null,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Save failed");
      toast.success("Marketplace settings saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-royal-100 bg-royal-50/30 p-4 space-y-3">
      <p className="text-sm font-semibold text-navy-800">Marketplace & ratings (admin only)</p>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.isMarketplaceListed}
          onChange={(e) => setForm({ ...form, isMarketplaceListed: e.target.checked })}
        />
        Listed on marketplace
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.featured}
          onChange={(e) => setForm({ ...form, featured: e.target.checked })}
        />
        Featured pool
      </label>

      <Input
        placeholder="Tagline"
        value={form.tagline}
        onChange={(e) => setForm({ ...form, tagline: e.target.value })}
      />
      <Input
        placeholder="Categories (comma-separated slugs: balanced, forex, …)"
        value={form.categories}
        onChange={(e) => setForm({ ...form, categories: e.target.value })}
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <Select
          value={form.securityRating || "none"}
          onValueChange={(v) =>
            setForm({ ...form, securityRating: v === "none" ? "" : v })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Security rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            {Object.entries(SECURITY_RATING_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={form.aggressivenessLevel || "none"}
          onValueChange={(v) =>
            setForm({ ...form, aggressivenessLevel: v === "none" ? "" : v })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Aggressiveness" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            {Object.entries(AGGRESSIVENESS_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={form.poolHealth}
          onValueChange={(v) => setForm({ ...form, poolHealth: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Pool health" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(POOL_HEALTH_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={form.capacityStatus}
          onValueChange={(v) => setForm({ ...form, capacityStatus: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Capacity" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CAPACITY_STATUS_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={form.lifecycleStatus}
          onValueChange={(v) => setForm({ ...form, lifecycleStatus: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Lifecycle" />
          </SelectTrigger>
          <SelectContent>
            {["draft", "submitted", "under_review", "approved", "live", "paused", "restricted", "closed", "archived"].map(
              (s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Input
          placeholder="RyvonX rating (1-5)"
          value={form.ryvonxRating}
          onChange={(e) => setForm({ ...form, ryvonxRating: e.target.value })}
        />
        <Input
          placeholder="Suggested investment"
          value={form.suggestedInvestment}
          onChange={(e) => setForm({ ...form, suggestedInvestment: e.target.value })}
        />
        <Input
          placeholder="Max investors"
          value={form.maxInvestorsCap}
          onChange={(e) => setForm({ ...form, maxInvestorsCap: e.target.value })}
        />
      </div>

      <Input
        placeholder="Max AUM"
        value={form.maxAum}
        onChange={(e) => setForm({ ...form, maxAum: e.target.value })}
      />
      <Input
        placeholder="Cover image URL"
        value={form.coverImageUrl}
        onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })}
      />
      <Input
        placeholder="Logo URL"
        value={form.logoUrl}
        onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
      />
      <Textarea
        placeholder="Risk summary (shown on join flow)"
        value={form.riskSummary}
        onChange={(e) => setForm({ ...form, riskSummary: e.target.value })}
        rows={2}
      />
      <Textarea
        placeholder="Admin comments (optional, shown on pool page)"
        value={form.adminComments}
        onChange={(e) => setForm({ ...form, adminComments: e.target.value })}
        rows={2}
      />

      <Button size="sm" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save marketplace settings"}
      </Button>
    </div>
  );
}
