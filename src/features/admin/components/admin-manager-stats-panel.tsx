"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  POOL_MANAGER_STAT_FIELD_LABELS,
  type PoolManagerAdminStatistics,
  type PoolManagerStatField,
} from "@/domain/pool-manager/admin-statistics";
import type { PoolManagerStatisticsView } from "@/services/pool-manager-stats.service";

const STAT_FIELDS = Object.keys(POOL_MANAGER_STAT_FIELD_LABELS) as PoolManagerStatField[];

function fieldInputType(field: PoolManagerStatField): "number" | "text" {
  return field === "riskRating" ? "text" : "number";
}

export function AdminManagerStatsPanel({
  managerId,
  initial,
}: {
  managerId: string;
  initial: PoolManagerStatisticsView;
}) {
  const [view, setView] = useState(initial);
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      STAT_FIELDS.map((field) => {
        const value = view.statistics[field];
        return [field, value == null ? "" : String(value)];
      })
    )
  );
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const dirtyFields = useMemo(() => {
    return STAT_FIELDS.filter((field) => {
      const current = view.statistics[field];
      const nextRaw = draft[field] ?? "";
      const next =
        nextRaw === ""
          ? null
          : field === "riskRating"
            ? nextRaw
            : Number(nextRaw);
      return current !== next;
    });
  }, [draft, view.statistics]);

  async function save() {
    setSaving(true);
    try {
      const patch: Partial<PoolManagerAdminStatistics> = {};
      for (const field of dirtyFields) {
        const raw = draft[field] ?? "";
        if (raw === "") {
          patch[field] = null;
        } else if (field === "riskRating") {
          patch[field] = raw;
        } else {
          patch[field] = Number(raw);
        }
      }

      const res = await fetch(`/api/admin/managers/${managerId}/stats`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patch, reason: reason.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");

      setView(data as PoolManagerStatisticsView);
      setDraft(
        Object.fromEntries(
          STAT_FIELDS.map((field) => {
            const value = (data as PoolManagerStatisticsView).statistics[field];
            return [field, value == null ? "" : String(value)];
          })
        )
      );
      toast.success("Statistics updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function resetAll() {
    if (!confirm("Reset all editable statistics for this Pool Manager?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/managers/${managerId}/stats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", reason: reason.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Reset failed");

      setView(data as PoolManagerStatisticsView);
      setDraft(
        Object.fromEntries(
          STAT_FIELDS.map((field) => {
            const value = (data as PoolManagerStatisticsView).statistics[field];
            return [field, value == null ? "" : String(value)];
          })
        )
      );
      toast.success("Statistics reset");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-navy-900">Statistics Management</h3>
          <p className="mt-1 text-sm text-navy-500">
            Edit public metrics anytime. Changes sync to marketplace, profiles, and rankings.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={saving} onClick={() => void resetAll()}>
            Reset
          </Button>
          <Button size="sm" disabled={saving || dirtyFields.length === 0} onClick={() => void save()}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-xs text-navy-500">Reason (optional, for audit trail)</label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder="e.g. Performance review adjustment"
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STAT_FIELDS.map((field) => (
          <label key={field}>
            <span className="mb-1 block text-xs text-navy-500">
              {POOL_MANAGER_STAT_FIELD_LABELS[field]}
            </span>
            <Input
              type={fieldInputType(field)}
              step={fieldInputType(field) === "number" ? "any" : undefined}
              value={draft[field] ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, [field]: e.target.value }))}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
