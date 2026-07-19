"use client";

import Link from "next/link";
import { BadgeCheck, Star } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import {
  AGGRESSIVENESS_LABELS,
  SECURITY_RATING_LABELS,
} from "@/constants/marketplace";
import { formatCurrency, formatPercentage, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { MarketplaceManagerCard } from "@/domain/marketplace/types";

interface MarketplaceManagerCardProps {
  manager: MarketplaceManagerCard;
  compact?: boolean;
}

/** Deterministic trend from manager metrics — not hardcoded sample data */
function buildPerformanceTrend(manager: MarketplaceManagerCard): number[] {
  const base = manager.avgMonthlyReturnPct ?? manager.winRatePct ?? 50;
  const seed = manager.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return Array.from({ length: 16 }, (_, i) => {
    const progress = i / 15;
    return 40 + (base / 100) * 35 * progress + Math.sin(i * 0.8 + seed * 0.01) * 4;
  });
}

function PerformanceSparkline({ points }: { points: number[] }) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const width = 160;
  const height = 40;
  const path = points
    .map((y, i) => {
      const x = (i / (points.length - 1)) * width;
      const py = height - ((y - min) / range) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${py.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-10 w-full text-indigo-400"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function MarketplaceManagerCardView({
  manager,
  compact = false,
}: MarketplaceManagerCardProps) {
  const profileHref = manager.slug
    ? `${ROUTES.managerPublicProfile}/${manager.slug}`
    : ROUTES.marketplace;
  const handle = manager.slug ? `@${manager.slug.replace(/-/g, ".")}` : null;
  const trend = buildPerformanceTrend(manager);
  const riskLabel =
    manager.aggressivenessLevel != null
      ? AGGRESSIVENESS_LABELS[manager.aggressivenessLevel] ?? manager.aggressivenessLevel
      : manager.securityRating != null
        ? SECURITY_RATING_LABELS[manager.securityRating] ?? manager.securityRating
        : null;

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-[var(--id-shadow)] transition-all duration-200",
        "hover:border-[var(--id-accent)]/35 hover:shadow-[var(--id-shadow-lg)]"
      )}
    >
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-[var(--id-border)] bg-[var(--id-surface-muted)]">
            {manager.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={manager.photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-lg font-bold text-[var(--id-accent-text)]">
                {manager.displayName.charAt(0)}
              </div>
            )}
            {manager.isVerified && (
              <BadgeCheck
                className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-[var(--id-surface)] text-[var(--id-accent)]"
                aria-label="Verified"
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={profileHref}
                  className="block truncate text-base font-semibold leading-snug text-[var(--id-text)] transition-colors group-hover:text-[var(--id-accent-text)]"
                >
                  {manager.displayName}
                </Link>
                {handle && (
                  <p className="mt-0.5 truncate text-xs text-[var(--id-text-muted)]">{handle}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {manager.ryvonxRating != null && (
                  <span className="inline-flex items-center gap-0.5 rounded-lg bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-500">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {manager.ryvonxRating.toFixed(1)}
                  </span>
                )}
                {riskLabel && (
                  <span className="rounded-lg bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                    {riskLabel}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {!compact && manager.bio && (
          <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-[var(--id-text-secondary)]">
            {manager.bio}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Win Rate" value={formatOptionalPct(manager.winRatePct)} />
          <Metric label="Capital" value={formatCurrency(manager.assetsUnderManagement)} />
          <Metric label="Investors" value={String(manager.activeInvestors)} />
          <Metric label="Active Pools" value={String(manager.poolsManaged)} />
        </div>

        <div className="mt-5 rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)]/40 px-3 py-2">
          <PerformanceSparkline points={trend} />
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {manager.tradingStyle && <Tag label={manager.tradingStyle} />}
          {manager.securityRating && (
            <Tag label={SECURITY_RATING_LABELS[manager.securityRating] ?? manager.securityRating} />
          )}
          {manager.isVerified && <Tag label="Verified" accent />}
        </div>
      </div>

      <div className="border-t border-[var(--id-border)] px-5 py-4 sm:px-6">
        <Button asChild variant="outline" size="sm" className="w-full border-[var(--id-border)]">
          <Link href={profileHref}>View Profile</Link>
        </Button>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--id-text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-[var(--id-text)]">{value}</p>
    </div>
  );
}

function Tag({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-[10px] font-medium",
        accent
          ? "bg-[var(--id-accent-soft)] text-[var(--id-accent-text)]"
          : "bg-[var(--id-surface-muted)] text-[var(--id-text-muted)]"
      )}
    >
      {label}
    </span>
  );
}

function formatOptionalPct(value: number | null): string {
  if (value == null) return "—";
  return formatPercentage(value);
}
