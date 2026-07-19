"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RatingBreakdownPanel, RatingTimeline, ScoreBadge, TrendIndicator } from "@/features/performance-intelligence/components/rating-display";
import type { AdminIntelligenceDashboard } from "@/domain/performance-intelligence/types";
import type { RatingCategory } from "@/constants/rating";
import type { RatingCategoryWeight, RatingProfile } from "@/domain/performance-intelligence/types";

async function postRecalculate() {
  const res = await fetch("/api/admin/rating-configuration/recalculate", { method: "POST" });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Recalculation failed");
}

async function patchWeights(profileId: string, weights: Array<{ category: RatingCategory; weight: number }>) {
  const res = await fetch("/api/admin/rating-configuration", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profileId, weights }),
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Failed to update weights");
}

export function AdminPerformanceIntelligenceClient({
  dashboard,
  profile,
  weights: initialWeights,
}: {
  dashboard: AdminIntelligenceDashboard;
  profile: RatingProfile | null;
  weights: RatingCategoryWeight[];
}) {
  const [weights, setWeights] = useState(initialWeights);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const saveWeights = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setMessage(null);
    try {
      await patchWeights(
        profile.id,
        weights.map((w) => ({ category: w.category, weight: w.weight }))
      );
      setMessage("Rating weights updated and audited.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }, [profile, weights]);

  const recalculate = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      await postRecalculate();
      setMessage("Platform ratings recalculated.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Recalculation failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const totalWeight = weights.reduce((s, w) => s + w.weight, 0);

  return (
    <div className="space-y-8">
      {message && <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{message}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Avg Manager Rating" value={`${dashboard.platformPerformance.averageManagerRating} ★`} />
        <StatCard label="Managers Rated" value={String(dashboard.platformPerformance.managersRated)} />
        <StatCard label="Rating Changes (30d)" value={String(dashboard.platformPerformance.ratingChangesLast30Days)} />
        <StatCard label="Operational Alerts" value={String(dashboard.platformPerformance.operationalAlerts)} />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button size="sm" disabled={loading} onClick={() => void recalculate()}>
          Recalculate All Ratings
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href={ROUTES.adminRatingConfiguration}>Rating Configuration</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <RankingCard title="Top Managers" items={dashboard.topManagers.map((m) => ({
          id: m.managerId,
          name: m.name,
          href: `${ROUTES.adminManagers}/${m.managerId}`,
          badge: `${m.rating.toFixed(1)} ★`,
        }))} />
        <RankingCard title="Highest Risk" items={dashboard.highestRiskManagers.map((m) => ({
          id: m.managerId,
          name: m.name,
          href: `${ROUTES.adminManagers}/${m.managerId}`,
          badge: m.riskGrade,
        }))} />
        <RankingCard title="Governance Rankings" items={dashboard.governanceRankings.map((m) => ({
          id: m.managerId,
          name: m.name,
          href: `${ROUTES.adminManagers}/${m.managerId}`,
          badge: m.governanceGrade,
        }))} />
      </div>

      <section className="rounded-xl border border-white/10 bg-navy-900/40 p-6">
        <h3 className="text-lg font-semibold text-white">Rating Configuration</h3>
        <p className="mt-1 text-sm text-navy-400">
          Active profile: {profile?.name ?? "None"}. Weights must sum to 100%.
        </p>
        {profile && (
          <div className="mt-4 space-y-3">
            {weights.map((w) => (
              <div key={w.id} className="flex flex-wrap items-center gap-3">
                <span className="w-48 text-sm text-navy-300">{w.label}</span>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  max={1}
                  value={w.weight}
                  className="max-w-[120px] border-white/10 bg-navy-950"
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setWeights((prev) =>
                      prev.map((x) => (x.id === w.id ? { ...x, weight: val } : x))
                    );
                  }}
                />
              </div>
            ))}
            <p className={`text-xs ${Math.abs(totalWeight - 1) > 0.01 ? "text-rose-400" : "text-navy-500"}`}>
              Total weight: {(totalWeight * 100).toFixed(1)}%
            </p>
            <Button size="sm" disabled={loading || Math.abs(totalWeight - 1) > 0.01} onClick={() => void saveWeights()}>
              Save Weights
            </Button>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-white/10 bg-navy-900/40 p-6">
        <h3 className="text-lg font-semibold text-white">Recent Rating Changes</h3>
        <div className="mt-4">
          <RatingTimeline entries={dashboard.recentRatingChanges} />
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-navy-900/40 p-4">
      <p className="text-xs text-navy-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function RankingCard({
  title,
  items,
}: {
  title: string;
  items: Array<{ id: string; name: string; href: string; badge: string }>;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-navy-900/40 p-4">
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-navy-500">No data yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between text-sm">
              <Link href={item.href} className="text-navy-300 hover:text-white">
                {item.name}
              </Link>
              <ScoreBadge grade={item.badge} size="sm" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function InvestorRatingPanel({
  rating,
}: {
  rating: {
    overallRating: number | null;
    overallScore: number;
    performanceGrade: string | null;
    riskGrade: string | null;
    confidenceScore: number | null;
    trend: "up" | "down" | "stable";
    breakdown: Array<{ label: string; score: number; explanation: string }>;
    comparedTo: string;
  };
}) {
  return (
    <section className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5">
      <h2 className="font-semibold text-[var(--id-text)]">Performance Intelligence</h2>
      <p className="mt-1 text-sm text-[var(--id-text-muted)]">
        Explainable ratings from verified platform activity — not investor payouts or proprietary formulas.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InvestorStat label="Manager Rating" value={rating.overallRating != null ? `${rating.overallRating.toFixed(1)} ★` : "—"} />
        <InvestorStat label="Performance" value={rating.performanceGrade ?? "—"} />
        <InvestorStat label="Risk Indicator" value={rating.riskGrade ?? "—"} />
        <InvestorStat label="Confidence" value={rating.confidenceScore != null ? `${Math.round(rating.confidenceScore)}%` : "—"} />
      </div>

      <div className="mt-4 flex items-center gap-4 text-sm text-[var(--id-text-muted)]">
        <TrendIndicator trend={rating.trend} />
        <span>{rating.comparedTo}</span>
      </div>

      <div className="mt-6 text-[var(--id-text-muted)]">
        <RatingBreakdownPanel breakdown={rating.breakdown} title="Why this score?" />
      </div>
    </section>
  );
}

function InvestorStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--id-border)] bg-[var(--id-bg)] p-3">
      <p className="text-xs text-[var(--id-text-muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--id-text)]">{value}</p>
    </div>
  );
}
