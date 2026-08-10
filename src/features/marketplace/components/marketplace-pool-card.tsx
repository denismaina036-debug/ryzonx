"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Building2,
  CircleDollarSign,
  Clock,
  Crosshair,
  Heart,
  Star,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { INVESTMENT_CYCLE_STATUS_LABELS } from "@/constants/investment-cycle";
import { formatCurrency, cn } from "@/lib/utils";
import { PoolCoverBanner } from "@/features/marketplace/components/pool-cover-banner";
import { ManagerCountryBadge } from "@/features/marketplace/components/manager-country-badge";
import { MobileMarketplacePoolCard } from "@/features/marketplace/components/mobile-marketplace-pool-card";
import { Button } from "@/components/ui/button";
import type { MarketplacePoolCard } from "@/domain/marketplace/types";
import { formatRaisedCapitalPct, shouldShowPoolTagline } from "@/features/marketplace/utils/marketplace-pool-card-presentation";
import { isCycleTradingPhase } from "@/lib/investment/cycle-display-phase";
import { PoolCardRoiPreview } from "@/features/marketplace/components/pool-card-roi-preview";
import { formatTradingDateTimeLabel } from "@/domain/pools/trading-session";

interface MarketplacePoolCardProps {
  pool: MarketplacePoolCard;
  compact?: boolean;
}

export function MarketplacePoolCardView({ pool }: MarketplacePoolCardProps) {
  return (
    <>
      <div className="md:hidden">
        <MobileMarketplacePoolCard pool={pool} />
      </div>
      <div className="hidden md:block">
        <DesktopMarketplacePoolCard pool={pool} />
      </div>
    </>
  );
}

function DesktopMarketplacePoolCard({ pool }: MarketplacePoolCardProps) {
  const isTrading = pool.activeCycle != null && isCycleTradingPhase(pool.activeCycle.status);
  const raisedPct = formatRaisedCapitalPct(pool.raisedCapital, pool.targetCapital);
  const progressPct = pool.targetCapital > 0
    ? Math.min(100, (pool.raisedCapital / pool.targetCapital) * 100)
    : 0;
  const participateDisabled =
    !pool.canParticipate ||
    pool.capacityStatus === "full" ||
    pool.capacityStatus === "closed";

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-[var(--id-border)] bg-[var(--id-surface)] shadow-sm",
        "transition-shadow duration-300 hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/20"
      )}
    >
      {/* Cover — image only; pool name shown once in title below */}
      <PoolCoverBanner
        coverImageUrl={pool.coverImageUrl}
        cardBackgroundColor={pool.cardBackgroundColor}
        coverImagePosition={pool.coverImagePosition}
        className="h-[96px] bg-cover bg-center sm:h-[100px]"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
          {pool.coverSubtitle ? (
            <p className="text-[10px] font-medium uppercase tracking-wider text-white/85">
              {pool.coverSubtitle}
            </p>
          ) : (
            <span />
          )}
          <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-medium text-emerald-300 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
            Active Pool
          </div>
        </div>
      </PoolCoverBanner>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {/* Title */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <h4 className="truncate text-base font-bold uppercase tracking-wide text-[var(--id-text)] sm:text-lg">
              {pool.displayPoolName || pool.name}
            </h4>
            {pool.poolVerified && (
              <BadgeCheck className="h-4 w-4 shrink-0 text-[var(--id-accent-text)]" aria-label="Verified pool" />
            )}
          </div>
          <Heart className="h-5 w-5 shrink-0 text-[var(--id-text-faint)]" aria-hidden />
        </div>

        <PoolCardDescription pool={pool} className="mt-3" />

        {/* Tags */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {pool.tradingAssetTag && (
            <TagPill variant="asset">{pool.tradingAssetTag}</TagPill>
          )}
          {pool.strategyTag && <TagPill>{pool.strategyTag}</TagPill>}
          {pool.tradingStyleTag && <TagPill>{pool.tradingStyleTag}</TagPill>}
          {pool.riskLevelTag && (
            <TagPill variant="risk">
              <BadgeCheck className="h-3 w-3" aria-hidden />
              {pool.riskLevelTag}
            </TagPill>
          )}
        </div>

        {/* Manager */}
        <div className="mt-4 flex items-start gap-3">
          {pool.managerPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pool.managerPhotoUrl}
              alt=""
              className="h-11 w-11 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--id-surface-muted)] text-sm font-semibold text-[var(--id-text-muted)]">
              {(pool.managerName ?? "M").charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-[var(--id-text-muted)]">Managed by</p>
            <div className="flex items-center gap-1.5">
              {pool.managerSlug ? (
                <Link
                  href={`${ROUTES.managerPublicProfile}/${pool.managerSlug}`}
                  className="truncate text-sm font-semibold text-[var(--id-text)] hover:text-[var(--id-accent-text)]"
                >
                  {pool.managerName ?? "RyvonX"}
                </Link>
              ) : (
                <span className="truncate text-sm font-semibold text-[var(--id-text)]">
                  {pool.managerName ?? "RyvonX"}
                </span>
              )}
              <ManagerCountryBadge countryCode={pool.managerCountryCode} />
              {pool.managerVerified && (
                <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[var(--id-accent-text)]" aria-hidden />
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-[var(--id-text-muted)]">
              {pool.managerRating != null && (
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
                  <span className="font-medium text-[var(--id-text)]">{pool.managerRating.toFixed(1)}</span>
                  {pool.managerReviewCount > 0 && (
                    <span>({pool.managerReviewCount} reviews)</span>
                  )}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" aria-hidden />
                {pool.activeInvestors} investors
              </span>
            </div>
          </div>
        </div>

        {/* Active Cycle */}
        <div className="mt-4 rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)]/60 p-3.5 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--id-text-muted)]">
              Active Cycle
            </p>
            {pool.activeCycle && (
              <span className="rounded-full bg-[var(--id-accent-soft)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--id-accent-text)]">
                {INVESTMENT_CYCLE_STATUS_LABELS[pool.activeCycle.status] ??
                  pool.activeCycle.status}
              </span>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-[11px]">
            <div className="space-y-3">
              <CycleStat
                icon={Clock}
                label="Funding Start"
                value={
                  formatTradingDateTimeLabel(
                    pool.activeCycle?.fundingStartedAt ??
                      pool.activeCycle?.openingDate ??
                      undefined
                  ) ?? "—"
                }
              />
              {pool.tradingScheduleLabel ? (
                <CycleStat
                  icon={Clock}
                  label="Trading Time"
                  value={pool.tradingScheduleLabel}
                />
              ) : null}
              <CycleStat
                icon={Clock}
                label="Payout Duration"
                value={pool.expectedDurationLabel}
              />
              <CycleStat
                icon={Crosshair}
                label="Traded Instrument"
                value={pool.tradingAssetTag ?? "—"}
              />
              <CycleStat
                icon={Wallet}
                label="Minimum Deposit"
                value={formatCurrency(pool.minInvestment)}
              />
              <CycleStat
                icon={Building2}
                label={isTrading ? "Total Capital Under Management" : "Target Capital"}
                value={
                  isTrading
                    ? formatCurrency(pool.raisedCapital)
                    : pool.targetCapital > 0
                      ? formatCurrency(pool.targetCapital)
                      : "—"
                }
              />
            </div>
            <div className="space-y-3">
              <CycleStat
                icon={CircleDollarSign}
                label={isTrading ? "Capital Traded" : "Raised Capital"}
                value={
                  isTrading
                    ? formatCurrency(pool.raisedCapital)
                    : pool.targetCapital > 0
                      ? `${formatCurrency(pool.raisedCapital)} (${raisedPct}%)`
                      : formatCurrency(pool.raisedCapital)
                }
                extra={
                  !isTrading && pool.targetCapital > 0 ? (
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--id-border)]">
                      <div
                        className="h-full rounded-full bg-[var(--id-accent)]"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  ) : null
                }
              />
              <CycleStat
                icon={User}
                label="Investors"
                value={String(pool.cycleParticipantCount)}
              />
            </div>
          </div>
        </div>

        {/* ROI targets row */}
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[var(--id-border)] pt-4 text-center">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--id-text-muted)]">
              Projected ROI
            </p>
            <PoolCardRoiPreview pool={pool} className="mt-2" />
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--id-text-muted)]">
              Return Duration
            </p>
            <p className="mt-2 text-sm font-bold leading-snug text-[var(--id-text)]">
              {pool.expectedDurationLabel}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--id-text-muted)]">
              Level
            </p>
            <p className="mt-2 text-sm font-bold text-[var(--id-success)]">{pool.poolLevelLabel}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Button
            asChild
            variant="outline"
            className="h-10 border-[var(--id-accent)] text-[var(--id-accent-text)] hover:bg-[var(--id-accent-soft)]"
          >
            <Link href={`${ROUTES.marketplace}/${pool.slug}`}>View Details</Link>
          </Button>
          <Button
            asChild={!participateDisabled}
            disabled={participateDisabled}
            className="h-10 bg-[var(--id-accent)] text-white hover:bg-[var(--id-accent)]/90 disabled:opacity-50"
          >
            {participateDisabled ? (
              <span>Invest in Pool</span>
            ) : (
              <Link href={`${ROUTES.marketplace}/${pool.slug}/join`}>Invest in Pool</Link>
            )}
          </Button>
        </div>
      </div>
    </motion.article>
  );
}

function TagPill({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "asset" | "risk";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium",
        variant === "asset" && "bg-[var(--id-accent-soft)] text-[var(--id-accent-text)]",
        variant === "risk" && "bg-[var(--id-success-soft)] text-[var(--id-success)]",
        variant === "default" && "bg-[var(--id-surface-muted)] text-[var(--id-text-muted)]"
      )}
    >
      {children}
    </span>
  );
}

function CycleStat({
  icon: Icon,
  label,
  value,
  extra,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  extra?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-start gap-1.5">
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--id-accent-text)]" aria-hidden />
        <div className="min-w-0">
          <p className="text-[10px] text-[var(--id-text-muted)]">{label}</p>
          <p className="mt-0.5 text-xs font-semibold leading-snug text-[var(--id-text)]">{value}</p>
          {extra}
        </div>
      </div>
    </div>
  );
}

export function PoolCardDescription({
  pool,
  className,
}: {
  pool: MarketplacePoolCard;
  className?: string;
}) {
  const text = pool.tagline?.trim();
  if (!text) return null;
  if (!shouldShowPoolTagline(text, pool.displayPoolName || pool.name, pool.name)) return null;
  return (
    <p
      className={cn(
        "text-wrap-pretty text-sm leading-relaxed text-[var(--id-text-secondary)] line-clamp-3",
        className
      )}
    >
      {text}
    </p>
  );
}
