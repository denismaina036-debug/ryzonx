"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BadgeCheck, Shield, TrendingUp, Users, Wallet } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import {
  AGGRESSIVENESS_LABELS,
  CAPACITY_STATUS_LABELS,
  POOL_HEALTH_LABELS,
  SECURITY_RATING_LABELS,
} from "@/constants/marketplace";
import { PROTECTION_INDICATOR_LABELS } from "@/constants/governance";
import { formatCurrency, formatPercentage, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { MarketplacePoolCard } from "@/domain/marketplace/types";

interface MarketplacePoolCardProps {
  pool: MarketplacePoolCard;
  compact?: boolean;
}

export function MarketplacePoolCardView({ pool, compact = false }: MarketplacePoolCardProps) {
  const bannerStyle = pool.coverImageUrl
    ? { backgroundImage: `url(${pool.coverImageUrl})` }
    : {
        background: pool.cardBackgroundColor
          ? `linear-gradient(135deg, ${pool.cardBackgroundColor} 0%, #0a0f18 100%)`
          : "linear-gradient(135deg, #1a2744 0%, #0a0f18 100%)",
      };

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm",
        "transition-shadow duration-300 hover:shadow-xl hover:shadow-black/5"
      )}
    >
      <div
        className="relative h-36 bg-cover bg-center sm:h-40"
        style={bannerStyle}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-navy-950/20 to-transparent" />
        {pool.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-amber-400/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy-950">
            Featured
          </span>
        )}
        {pool.isRyvonxBacked && (
          <span className="absolute right-3 top-3 rounded-full bg-royal-500/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            RyvonX Backed
          </span>
        )}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          {pool.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pool.logoUrl}
              alt=""
              className="h-10 w-10 rounded-xl border-2 border-white/20 object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-sm font-bold text-white backdrop-blur">
              {pool.name.charAt(0)}
            </div>
          )}
          <div>
            <h3 className="text-base font-semibold text-white drop-shadow">{pool.name}</h3>
            {pool.tagline && !compact && (
              <p className="max-w-[200px] truncate text-xs text-white/70">{pool.tagline}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center gap-2 text-sm text-[var(--id-text-secondary)]">
          {pool.managerPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pool.managerPhotoUrl}
              alt=""
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : null}
          {pool.managerSlug ? (
            <Link
              href={`${ROUTES.managerPublicProfile}/${pool.managerSlug}`}
              className="font-medium text-[var(--id-text)] hover:text-[var(--id-accent-text)]"
            >
              {pool.managerName ?? "RyvonX"}
            </Link>
          ) : (
            <span className="font-medium text-[var(--id-text)]">{pool.managerName ?? "RyvonX"}</span>
          )}
          {pool.managerVerified && (
            <BadgeCheck className="h-4 w-4 text-[var(--id-accent-text)]" aria-label="Verified manager" />
          )}
          {pool.ryvonxRating != null && (
            <span className="ml-auto text-xs font-semibold text-amber-600">
              ★ {pool.ryvonxRating.toFixed(1)}
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <Metric icon={Wallet} label="Capital" value={formatCurrency(pool.assetsUnderManagement)} />
          <Metric icon={Users} label="Investors" value={String(pool.activeInvestors)} />
          <Metric
            icon={TrendingUp}
            label="Monthly"
            value={formatPercentage(pool.monthlyReturnPct)}
            accent={pool.monthlyReturnPct >= 0 ? "text-emerald-600" : "text-rose-600"}
          />
          <Metric
            icon={TrendingUp}
            label="Overall"
            value={formatPercentage(pool.overallReturnPct)}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {pool.securityRating && (
            <RatingChip
              icon={Shield}
              label={SECURITY_RATING_LABELS[pool.securityRating] ?? pool.securityRating}
            />
          )}
          {pool.aggressivenessLevel && (
            <RatingChip
              label={AGGRESSIVENESS_LABELS[pool.aggressivenessLevel] ?? pool.aggressivenessLevel}
            />
          )}
          <RatingChip
            label={POOL_HEALTH_LABELS[pool.poolHealth] ?? pool.poolHealth}
            variant={pool.poolHealth === "healthy" ? "success" : "muted"}
          />
          {pool.protectionIndicators.slice(0, 2).map((ind) => (
            <RatingChip
              key={ind}
              label={PROTECTION_INDICATOR_LABELS[ind] ?? ind}
              variant={ind === "healthy" ? "success" : "default"}
            />
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--id-text-faint)]">Min investment</p>
            <p className="font-semibold text-[var(--id-text)]">{formatCurrency(pool.minInvestment)}</p>
            <p className="text-[10px] text-[var(--id-text-faint)]">
              {CAPACITY_STATUS_LABELS[pool.capacityStatus] ?? pool.capacityStatus}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`${ROUTES.marketplace}/${pool.slug}`}>View Opportunity</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`${ROUTES.marketplace}/${pool.slug}/join`}>Join Pool</Link>
            </Button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg bg-[var(--id-surface-muted)] px-2.5 py-2">
      <div className="flex items-center gap-1 text-[var(--id-text-faint)]">
        <Icon className="h-3 w-3" />
        <span>{label}</span>
      </div>
      <p className={cn("mt-0.5 font-semibold text-[var(--id-text)]", accent)}>{value}</p>
    </div>
  );
}

function RatingChip({
  icon: Icon,
  label,
  variant = "default",
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  variant?: "default" | "success" | "muted";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        variant === "success" && "bg-emerald-50 text-emerald-700",
        variant === "muted" && "bg-[var(--id-surface-muted)] text-[var(--id-text-muted)]",
        variant === "default" && "bg-[var(--id-accent-soft)] text-[var(--id-accent-text)]"
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </span>
  );
}
