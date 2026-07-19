"use client";

import { cn } from "@/lib/utils";
import type { RatingTrend } from "@/constants/rating";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

export function ScoreBadge({
  score,
  grade,
  size = "md",
}: {
  score?: number | null;
  grade?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const display = grade ?? (score != null ? `${Math.round(score)}` : "—");
  const sizeClass =
    size === "lg" ? "px-4 py-2 text-lg" : size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg font-semibold ring-1 ring-inset",
        sizeClass,
        score != null && score >= 80
          ? "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30"
          : score != null && score >= 60
            ? "bg-amber-500/15 text-amber-200 ring-amber-500/30"
            : "bg-rose-500/10 text-rose-200 ring-rose-500/25"
      )}
    >
      {display}
    </span>
  );
}

export function TrendIndicator({ trend }: { trend: RatingTrend }) {
  if (trend === "up") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
        <TrendingUp className="h-3.5 w-3.5" /> Improving
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-rose-400">
        <TrendingDown className="h-3.5 w-3.5" /> Declining
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-navy-400">
      <Minus className="h-3.5 w-3.5" /> Stable
    </span>
  );
}

export function RatingBreakdownPanel({
  breakdown,
  title = "Score Breakdown",
  className,
}: {
  breakdown: Array<{ label: string; score: number; explanation: string; weight?: number }>;
  title?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {breakdown.length === 0 ? (
        <p className="text-sm text-navy-500">No rating data available yet.</p>
      ) : (
        <ul className="space-y-3">
          {breakdown.map((item) => (
            <li key={item.label} className="rounded-lg border border-white/[0.06] bg-navy-950/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-white">{item.label}</span>
                <ScoreBadge score={item.score} size="sm" />
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-amber-400/70"
                  style={{ width: `${Math.min(100, item.score)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-navy-400">{item.explanation}</p>
              {item.weight != null && (
                <p className="mt-1 text-[10px] uppercase tracking-wide text-navy-500">
                  Weight {(item.weight * 100).toFixed(0)}%
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RatingTimeline({
  entries,
}: {
  entries: Array<{
    createdAt: string;
    previousRating: number | null;
    newRating: number;
    reason: string;
  }>;
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-navy-500">No rating history recorded.</p>;
  }
  return (
    <ul className="space-y-3 border-l border-white/10 pl-4">
      {entries.map((e) => (
        <li key={`${e.createdAt}-${e.newRating}`} className="relative">
          <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-amber-400/80" />
          <p className="text-sm text-white">
            {e.previousRating != null ? `${e.previousRating.toFixed(1)} → ` : ""}
            {e.newRating.toFixed(1)} stars
          </p>
          <p className="text-xs text-navy-400">{e.reason}</p>
          <p className="text-xs text-navy-500">{new Date(e.createdAt).toLocaleString("en-GB")}</p>
        </li>
      ))}
    </ul>
  );
}
