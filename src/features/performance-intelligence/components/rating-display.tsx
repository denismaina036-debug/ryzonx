"use client";

import { cn } from "@/lib/utils";
import type { RatingTrend } from "@/constants/rating";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

export interface RatingBreakdownItem {
  label: string;
  score: number;
  explanation: string;
  weight?: number;
}

function clampScore(score: number): number {
  return Math.min(100, Math.max(0, score));
}

function scoreBarClass(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-rose-500";
}

function scoreTextClass(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  if (score >= 40) return "text-orange-600 dark:text-orange-400";
  return "text-rose-600 dark:text-rose-400";
}

function shortLabel(label: string): string {
  const words = label.split(/\s+/);
  if (words.length <= 2) return label;
  return `${words[0]} ${words[1]}`;
}

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
  const numericScore = score ?? null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg font-semibold ring-1 ring-inset",
        sizeClass,
        numericScore != null && numericScore >= 80
          ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300"
          : numericScore != null && numericScore >= 60
            ? "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300"
            : "bg-rose-500/10 text-rose-700 ring-rose-500/25 dark:text-rose-300"
      )}
    >
      {display}
    </span>
  );
}

export function TrendIndicator({ trend }: { trend: RatingTrend }) {
  if (trend === "up") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
        <TrendingUp className="h-3.5 w-3.5" /> Improving
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
        <TrendingDown className="h-3.5 w-3.5" /> Declining
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[var(--id-text-muted)]">
      <Minus className="h-3.5 w-3.5" /> Stable
    </span>
  );
}

function RatingBarChart({ breakdown }: { breakdown: RatingBreakdownItem[] }) {
  return (
    <div className="rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] p-4">
      <div className="mb-3 flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-[var(--id-text-faint)]">
        <span>Score by category</span>
        <span>0 – 100</span>
      </div>

      <div className="flex h-36 items-end gap-2 sm:gap-3">
        {breakdown.map((item) => {
          const score = clampScore(item.score);
          return (
            <div
              key={item.label}
              className="group flex min-w-0 flex-1 flex-col items-center"
              title={`${item.label}: ${Math.round(score)} — ${item.explanation}`}
            >
              <span className={cn("mb-1 text-xs font-semibold tabular-nums", scoreTextClass(score))}>
                {Math.round(score)}
              </span>
              <div className="relative flex h-28 w-full items-end justify-center">
                <div
                  className={cn(
                    "w-full max-w-[2.25rem] rounded-t-md transition-all duration-300 sm:max-w-none",
                    scoreBarClass(score)
                  )}
                  style={{ height: `${Math.max(score, 4)}%` }}
                />
              </div>
              <span className="mt-2 line-clamp-2 text-center text-[10px] leading-tight text-[var(--id-text-muted)] sm:text-[11px]">
                {shortLabel(item.label)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RatingBarRows({ breakdown }: { breakdown: RatingBreakdownItem[] }) {
  return (
    <div className="space-y-2">
      {breakdown.map((item) => {
        const score = clampScore(item.score);
        return (
          <div
            key={item.label}
            className="grid grid-cols-[minmax(7rem,9rem)_1fr_auto] items-center gap-2 sm:grid-cols-[minmax(8.5rem,10rem)_1fr_auto] sm:gap-3"
          >
            <span
              className="truncate text-xs font-medium text-[var(--id-text-secondary)]"
              title={item.label}
            >
              {item.label}
            </span>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--id-border)]">
              <div
                className={cn("h-full rounded-full transition-all duration-300", scoreBarClass(score))}
                style={{ width: `${score}%` }}
              />
            </div>
            <span className={cn("w-7 text-right text-xs font-semibold tabular-nums", scoreTextClass(score))}>
              {Math.round(score)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function RatingBreakdownPanel({
  breakdown,
  title = "Score Breakdown",
  className,
  showChart = true,
}: {
  breakdown: RatingBreakdownItem[];
  title?: string;
  className?: string;
  showChart?: boolean;
}) {
  if (breakdown.length === 0) {
    return (
      <div className={cn("space-y-3", className)}>
        {title ? <h3 className="text-sm font-semibold text-[var(--id-text)]">{title}</h3> : null}
        <p className="text-sm text-[var(--id-text-muted)]">No rating data available yet.</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {title ? <h3 className="text-sm font-semibold text-[var(--id-text)]">{title}</h3> : null}

      {showChart ? <RatingBarChart breakdown={breakdown} /> : null}

      <div className="rounded-xl border border-[var(--id-border)] bg-[var(--id-surface)] p-4">
        <RatingBarRows breakdown={breakdown} />
        <div className="mt-3 flex justify-between border-t border-[var(--id-border)] pt-2 text-[10px] text-[var(--id-text-faint)]">
          <span>0</span>
          <span>25</span>
          <span>50</span>
          <span>75</span>
          <span>100</span>
        </div>
      </div>

      <details className="rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] px-4 py-3">
        <summary className="cursor-pointer text-xs font-medium text-[var(--id-text-secondary)]">
          How these scores are calculated
        </summary>
        <ul className="mt-3 space-y-2 border-t border-[var(--id-border)] pt-3">
          {breakdown.map((item) => (
            <li key={item.label} className="text-xs leading-relaxed text-[var(--id-text-muted)]">
              <span className="font-medium text-[var(--id-text-secondary)]">{item.label}: </span>
              {item.explanation}
              {item.weight != null ? (
                <span className="ml-1 text-[var(--id-text-faint)]">
                  (weight {(item.weight * 100).toFixed(0)}%)
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </details>
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
    return <p className="text-sm text-[var(--id-text-muted)]">No rating history recorded.</p>;
  }
  return (
    <ul className="space-y-3 border-l border-[var(--id-border)] pl-4">
      {entries.map((e) => (
        <li key={`${e.createdAt}-${e.newRating}`} className="relative">
          <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-[var(--pm-accent)]" />
          <p className="text-sm text-[var(--id-text)]">
            {e.previousRating != null ? `${e.previousRating.toFixed(1)} → ` : ""}
            {e.newRating.toFixed(1)} stars
          </p>
          <p className="text-xs text-[var(--id-text-muted)]">{e.reason}</p>
          <p className="text-xs text-[var(--id-text-faint)]">
            {new Date(e.createdAt).toLocaleString("en-GB")}
          </p>
        </li>
      ))}
    </ul>
  );
}
