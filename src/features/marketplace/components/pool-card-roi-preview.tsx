"use client";

import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { formatMultiplier } from "@/domain/roi/calculator";
import type { MarketplacePoolCard } from "@/domain/marketplace/types";
import { resolvePoolCardRoiEntries } from "@/features/marketplace/utils/marketplace-pool-card-presentation";

interface PoolCardRoiPreviewProps {
  pool: MarketplacePoolCard;
  className?: string;
}

/** Compact ROI multiplier preview for marketplace pool cards. */
export function PoolCardRoiPreview({ pool, className }: PoolCardRoiPreviewProps) {
  const entries = resolvePoolCardRoiEntries(pool);

  if (entries.length === 0) {
    return (
      <div className={className}>
        <p className="text-sm font-semibold text-[var(--id-text-muted)]">—</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <ul className="mx-auto inline-flex max-w-full flex-col items-stretch gap-1">
        {entries.map((entry) => (
          <li
            key={entry.levelId}
            className="inline-flex items-center justify-between gap-2 rounded-md bg-[var(--id-surface-muted)]/80 px-2 py-1"
          >
            <span className="truncate text-[10px] font-medium text-[var(--id-text-secondary)]">
              {entry.name}
            </span>
            <span className="shrink-0 text-[11px] font-bold tabular-nums text-[var(--id-accent-text)]">
              {entry.multiplierLabel}
            </span>
          </li>
        ))}
      </ul>
      <Link
        href={`${ROUTES.marketplace}/${pool.slug}#return-structure`}
        className="mt-2 inline-block text-[10px] font-semibold uppercase tracking-wide text-[var(--id-accent-text)] hover:underline"
      >
        View tiers
      </Link>
    </div>
  );
}

export function PoolCardRoiPreviewInline({ pool }: { pool: MarketplacePoolCard }) {
  const entries = resolvePoolCardRoiEntries(pool);
  if (entries.length === 0) return <span className="text-[11px] text-[var(--id-text-muted)]">—</span>;

  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[11px]">
      {entries.map((entry, index) => (
        <span key={entry.levelId} className="inline-flex items-center gap-1">
          {index > 0 ? (
            <span className="text-[var(--id-text-faint)]" aria-hidden>
              ·
            </span>
          ) : null}
          <span className="text-[var(--id-text-muted)]">{entry.name}</span>
          <span className="font-bold tabular-nums text-[var(--id-accent-text)]">
            {formatMultiplier(entry.multiplier)}
          </span>
        </span>
      ))}
    </span>
  );
}
