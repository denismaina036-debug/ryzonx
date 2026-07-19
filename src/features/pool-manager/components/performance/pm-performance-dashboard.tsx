"use client";

import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { formatPercentage } from "@/lib/utils";
import { PmPageHeader, PmSectionCard } from "@/features/pool-manager/components/workspace/pm-page-header";
import { PmStatCard } from "@/features/pool-manager/components/workspace/pm-stat-card";
import {
  RatingBreakdownPanel,
  RatingTimeline,
  ScoreBadge,
  TrendIndicator,
} from "@/features/performance-intelligence/components/rating-display";
import type { ManagerRatingResult, PerformanceIntelligenceBundle } from "@/domain/performance-intelligence/types";
import { Star, Shield, Activity, Target } from "lucide-react";

export function PmPerformanceDashboard({
  rating,
  bundle,
}: {
  rating: ManagerRatingResult;
  bundle: PerformanceIntelligenceBundle;
}) {
  const { snapshot } = rating;

  return (
    <div className="space-y-8">
      <PmPageHeader
        eyebrow="Performance Intelligence"
        title="Performance Dashboard"
        description="Dynamic ratings derived from trading journal, cycle progress, and governance activity."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PmStatCard
          label="Overall Rating"
          value={snapshot.overallRating != null ? `${snapshot.overallRating.toFixed(1)} ★` : "—"}
          icon={Star}
          accent="text-amber-300"
        />
        <PmStatCard
          label="Performance Grade"
          value={snapshot.performanceGrade ?? "—"}
          icon={Target}
        />
        <PmStatCard
          label="Risk Grade"
          value={snapshot.riskGrade ?? "—"}
          icon={Shield}
          accent="text-cyan-300"
        />
        <PmStatCard
          label="Operational Score"
          value={snapshot.operationalScore != null ? String(Math.round(snapshot.operationalScore)) : "—"}
          icon={Activity}
        />
      </div>

      <div className="flex items-center gap-3 text-sm text-navy-400">
        <TrendIndicator trend={snapshot.trend} />
        <span>Confidence: {snapshot.confidenceScore != null ? Math.round(snapshot.confidenceScore) : "—"}/100</span>
        <span>Compared to platform average (benchmark placeholder)</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PmSectionCard title="Rating Breakdown">
          <RatingBreakdownPanel
            breakdown={rating.breakdown.map((b) => ({
              label: b.label,
              score: Math.round(b.score),
              explanation: b.explanation,
              weight: b.weight,
            }))}
          />
        </PmSectionCard>

        <PmSectionCard title="Rating History">
          <RatingTimeline entries={rating.history} />
        </PmSectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PmSectionCard title="Operational Strengths">
          {rating.strengths.length === 0 ? (
            <p className="text-sm text-navy-500">Complete more cycles and journal activity to build strengths.</p>
          ) : (
            <ul className="space-y-2 text-sm text-navy-300">
              {rating.strengths.map((s) => (
                <li key={s}>• {s}</li>
              ))}
            </ul>
          )}
        </PmSectionCard>

        <PmSectionCard title="Improvement Opportunities">
          {rating.improvements.length === 0 ? (
            <p className="text-sm text-navy-500">No critical improvement areas identified.</p>
          ) : (
            <ul className="space-y-2 text-sm text-navy-300">
              {rating.improvements.map((s) => (
                <li key={s}>• {s}</li>
              ))}
            </ul>
          )}
        </PmSectionCard>
      </div>

      <PmSectionCard title="Strategy Rankings">
        {bundle.strategies.length === 0 ? (
          <p className="text-sm text-navy-500">No strategies yet.</p>
        ) : (
          <ul className="divide-y divide-white/[0.04]">
            {[...bundle.strategies]
              .sort((a, b) => (b.rating?.overallScore ?? 0) - (a.rating?.overallScore ?? 0))
              .map((s) => (
                <li key={s.strategyId} className="flex items-center justify-between py-3 text-sm">
                  <Link href={`${ROUTES.poolManagerStrategies}/${s.strategyId}`} className="text-white hover:text-amber-200">
                    {s.strategyName}
                  </Link>
                  <div className="flex items-center gap-3">
                    <span className="text-navy-400">{formatPercentage(s.completionRate * 100)} completion</span>
                    <ScoreBadge score={s.rating?.overallScore ?? s.historicalPerformanceScore} size="sm" />
                  </div>
                </li>
              ))}
          </ul>
        )}
      </PmSectionCard>

      <PmSectionCard title="Cycle Rankings">
        {bundle.cycles.length === 0 ? (
          <p className="text-sm text-navy-500">No investment cycles yet.</p>
        ) : (
          <ul className="divide-y divide-white/[0.04]">
            {[...bundle.cycles]
              .sort((a, b) => b.operationalHealth - a.operationalHealth)
              .map((c) => (
                <li key={c.cycleId} className="flex items-center justify-between py-3 text-sm">
                  <Link
                    href={`${ROUTES.poolManagerInvestmentCycles}/${c.cycleId}`}
                    className="text-white hover:text-amber-200"
                  >
                    {c.cycleName}
                  </Link>
                  <div className="flex items-center gap-3 text-navy-400">
                    <span>{c.completionPercentage}% progress</span>
                    <ScoreBadge score={c.rating?.overallScore ?? c.operationalHealth} size="sm" />
                  </div>
                </li>
              ))}
          </ul>
        )}
      </PmSectionCard>
    </div>
  );
}
