"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/constants/routes";
import { formatCurrency } from "@/lib/utils";
import { formatDrawdownPct } from "@/lib/pool-manager/public-statistics";
import {
  POOL_MANAGER_EDITABLE_STAT_FIELDS,
  POOL_MANAGER_STAT_FIELD_HINTS,
  POOL_MANAGER_STAT_FIELD_LABELS,
  POOL_MANAGER_STAT_SECTIONS,
  type PoolManagerAdminStatistics,
  type PoolManagerStatField,
} from "@/domain/pool-manager/admin-statistics";
import { normalizePoolManagerStatPatch } from "@/domain/pool-manager/stat-validation";
import type {
  PoolManagerLiveMetrics,
  PoolManagerStatisticsView,
} from "@/services/pool-manager-stats.service";

const LIVE_TRACKED_FIELDS: Partial<
  Record<PoolManagerStatField, keyof PoolManagerLiveMetrics>
> = {
  winRatePct: "winRatePct",
  assetsUnderManagement: "assetsUnderManagement",
  displayInvestorCount: "activeInvestors",
  displayReviewCount: "publicReviewCount",
  displayTradeCount: "publicTradeCount",
  yearsOnRyvonX: "yearsOnRyvonX",
};

function fieldInputType(field: PoolManagerStatField): "number" | "text" {
  return field === "riskRating" ? "text" : "number";
}

function fieldInputConstraints(field: PoolManagerStatField): {
  min?: number;
  max?: number;
  step?: number;
} {
  switch (field) {
    case "ryvonxRating":
    case "securityRating":
      return { min: 0, max: 5, step: 0.1 };
    case "winRatePct":
    case "successRatio":
    case "consistencyScore":
    case "safetyRating":
    case "performanceRating":
      return { min: 0, max: 100, step: 0.01 };
    case "maxDrawdownPct":
      return { min: 0, max: 100, step: 0.01 };
    case "avgMonthlyReturnPct":
      return { min: -9999.9999, max: 9999.9999, step: 0.0001 };
    case "yearsOnRyvonX":
      return { min: 0, max: 80, step: 0.1 };
    case "displayInvestorCount":
    case "displayReviewCount":
    case "displayTradeCount":
    case "successfulCycles":
    case "followers":
      return { min: 0, step: 1 };
    default:
      return { min: 0, step: 0.01 };
  }
}

function formatMetricValue(
  field: PoolManagerStatField,
  value: unknown
): string {
  if (value == null || value === "") return "—";
  if (field === "assetsUnderManagement" || field === "totalCapitalManaged" || field === "totalProfits") {
    return formatCurrency(Number(value));
  }
  if (field === "yearsOnRyvonX") {
    return `${value} yrs`;
  }
  if (field === "maxDrawdownPct") {
    return formatDrawdownPct(Number(value));
  }
  return String(value);
}

function getLiveValue(
  field: PoolManagerStatField,
  liveMetrics: PoolManagerLiveMetrics
): string {
  const key = LIVE_TRACKED_FIELDS[field];
  if (!key) return "Not auto-tracked";
  return formatMetricValue(field, liveMetrics[key]);
}

function getPublishedValue(
  field: PoolManagerStatField,
  view: PoolManagerStatisticsView
): string {
  const key = LIVE_TRACKED_FIELDS[field];
  if (key) {
    return formatMetricValue(field, view.publishedMetrics[key]);
  }
  return formatMetricValue(field, view.statistics[field]);
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
      POOL_MANAGER_EDITABLE_STAT_FIELDS.map((field) => {
        const value = view.statistics[field];
        return [field, value == null ? "" : String(value)];
      })
    )
  );
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const dirtyFields = useMemo(() => {
    return POOL_MANAGER_EDITABLE_STAT_FIELDS.filter((field) => {
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

  function syncDraftFromView(next: PoolManagerStatisticsView) {
    setDraft(
      Object.fromEntries(
        POOL_MANAGER_EDITABLE_STAT_FIELDS.map((field) => {
          const value = next.statistics[field];
          return [field, value == null ? "" : String(value)];
        })
      )
    );
  }

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
          (patch as Record<string, unknown>)[field] = Number(raw);
        }
      }

      normalizePoolManagerStatPatch(patch);

      const res = await fetch(`/api/admin/managers/${managerId}/stats`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patch, reason: reason.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");

      const next = data as PoolManagerStatisticsView;
      setView(next);
      syncDraftFromView(next);
      toast.success("Profile statistics updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function resetAll() {
    if (
      !confirm(
        "Reset all profile statistics baselines for this manager? Live platform data will still apply where configured."
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/managers/${managerId}/stats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", reason: reason.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Reset failed");

      const next = data as PoolManagerStatisticsView;
      setView(next);
      syncDraftFromView(next);
      toast.success("Profile statistics reset");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h3 className="font-semibold text-navy-900">Profile Statistics</h3>
          <p className="mt-1 text-sm text-navy-500">
            Set public manager profile baselines from proven history here. For counts, capital,
            and tenure, live platform activity adds on top of your baseline automatically. You
            can adjust any value again at any time.
          </p>
          <p className="mt-2 text-xs text-navy-400">
            Per-pool marketplace display seeds (investors, raised capital on individual pool
            cards) are managed separately under{" "}
            <Link href={ROUTES.adminFunds} className="text-royal-600 hover:underline">
              Admin → Funds
            </Link>
            .
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={saving} onClick={() => void resetAll()}>
            Reset baselines
          </Button>
          <Button
            size="sm"
            disabled={saving || dirtyFields.length === 0}
            onClick={() => void save()}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-xs text-navy-500">
          Reason (optional, for audit trail)
        </label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder="e.g. Onboarding profile review"
        />
      </div>

      <div className="mt-8 space-y-8">
        {POOL_MANAGER_STAT_SECTIONS.map((section) => (
          <div key={section.id}>
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-navy-900">{section.title}</h4>
              {section.description && (
                <p className="mt-1 text-xs text-navy-500">{section.description}</p>
              )}
            </div>

            <div className="overflow-hidden rounded-lg border border-border/70">
              <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,0.7fr)] gap-3 border-b border-border/70 bg-muted/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-navy-500 sm:grid">
                <span>Metric</span>
                <span>Admin baseline</span>
                <span>Live system</span>
                <span>Published</span>
              </div>

              <div className="divide-y divide-border/60">
                {section.fields.map((field) => {
                  const label = POOL_MANAGER_STAT_FIELD_LABELS[field];
                  const hint = POOL_MANAGER_STAT_FIELD_HINTS[field];
                  const live = getLiveValue(field, view.liveMetrics);
                  const published = getPublishedValue(field, view);

                  return (
                    <div
                      key={field}
                      className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,0.7fr)] sm:items-center"
                    >
                      <div>
                        <p className="text-sm font-medium text-navy-800">{label}</p>
                        {hint && <p className="mt-0.5 text-xs text-navy-500">{hint}</p>}
                      </div>

                      <label>
                        <span className="mb-1 block text-[11px] text-navy-400 sm:hidden">
                          Admin baseline
                        </span>
                        <Input
                          type={fieldInputType(field)}
                          step={fieldInputType(field) === "number" ? fieldInputConstraints(field).step : undefined}
                          min={fieldInputType(field) === "number" ? fieldInputConstraints(field).min : undefined}
                          max={fieldInputType(field) === "number" ? fieldInputConstraints(field).max : undefined}
                          value={draft[field] ?? ""}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, [field]: e.target.value }))
                          }
                          placeholder="Leave blank for live only"
                        />
                      </label>

                      <div>
                        <span className="mb-1 block text-[11px] text-navy-400 sm:hidden">
                          Live system
                        </span>
                        <p className="text-sm tabular-nums text-navy-600">{live}</p>
                      </div>

                      <div>
                        <span className="mb-1 block text-[11px] text-navy-400 sm:hidden">
                          Published
                        </span>
                        <p className="text-sm font-medium tabular-nums text-navy-900">
                          {published}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
