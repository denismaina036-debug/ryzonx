"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Clock,
  RefreshCw,
  Shield,
  Star,
  Users,
  Wallet,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { INVESTMENT_CYCLE_STATUS_LABELS } from "@/constants/investment-cycle";
import { AGGRESSIVENESS_LABELS } from "@/constants/marketplace";
import { formatCurrency, cn } from "@/lib/utils";
import { PoolCoverBanner } from "@/features/marketplace/components/pool-cover-banner";
import { ManagerCountryBadge } from "@/features/marketplace/components/manager-country-badge";
import { Button } from "@/components/ui/button";
import { resolveMobilePoolBannerPresentation } from "@/features/marketplace/utils/marketplace-pool-card-presentation";
import type { MarketplacePoolCard } from "@/domain/marketplace/types";
import type { InvestmentCycleStatus } from "@/constants/investment-cycle";

interface MobileMarketplacePoolCardProps {
  pool: MarketplacePoolCard;
}

export function MobileMarketplacePoolCard({ pool }: MobileMarketplacePoolCardProps) {
  const participateDisabled =
    !pool.canParticipate ||
    pool.capacityStatus === "full" ||
    pool.capacityStatus === "closed";

  const banner = resolveMobilePoolBannerPresentation(pool);

  const cycleStatusLabel = pool.activeCycle
    ? INVESTMENT_CYCLE_STATUS_LABELS[pool.activeCycle.status] ?? pool.activeCycle.status
    : "—";

  const riskDisplay = resolveRiskLabel(pool);

  return (
    <motion.article
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      className={cn(
        "overflow-hidden rounded-[24px] border border-[var(--id-border)] bg-[var(--id-surface)]",
        "shadow-[0_8px_30px_rgba(15,23,42,0.06)] active:shadow-[0_12px_36px_rgba(15,23,42,0.1)]"
      )}
    >
      {/* 1. Pool Banner */}
      <PoolCoverBanner
        coverImageUrl={pool.coverImageUrl}
        cardBackgroundColor={pool.cardBackgroundColor}
        coverImagePosition={pool.coverImagePosition}
        className="h-[96px] bg-cover bg-center"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/40 to-black/5" />
        <div className="absolute right-2.5 top-2.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[9px] font-medium text-white backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
          Active Pool
        </div>
        <div className="absolute inset-x-0 top-0 flex h-full flex-col justify-start p-3">
          <h4 className="max-w-[72%] text-[17px] font-bold uppercase leading-[1.1] tracking-wide text-white">
            {banner.title}
          </h4>
          {(banner.categoryPill || banner.instrumentsLabel) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {banner.categoryPill ? (
                <span className="inline-flex rounded-full bg-indigo-600/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                  {banner.categoryPill}
                </span>
              ) : null}
              {banner.instrumentsLabel ? (
                <span className="text-[10px] font-medium text-white/95">
                  • {banner.instrumentsLabel}
                </span>
              ) : null}
            </div>
          )}
        </div>
      </PoolCoverBanner>

      {/* 2. Manager Section */}
      <div className="flex items-start gap-3 px-4 pb-3 pt-3.5">
        {pool.managerPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pool.managerPhotoUrl}
            alt=""
            className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-white"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--id-surface-muted)] text-sm font-semibold text-[var(--id-text-muted)] ring-2 ring-white">
            {(pool.managerName ?? "M").charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-[var(--id-text-muted)]">Managed by</p>
          <div className="flex items-center gap-1.5">
            {pool.managerSlug ? (
              <Link
                href={`${ROUTES.managerPublicProfile}/${pool.managerSlug}`}
                className="truncate text-[15px] font-semibold text-[var(--id-text)] hover:text-[var(--id-accent-text)]"
              >
                {pool.managerName ?? "RyvonX"}
              </Link>
            ) : (
              <span className="truncate text-[15px] font-semibold text-[var(--id-text)]">
                {pool.managerName ?? "RyvonX"}
              </span>
            )}
            <ManagerCountryBadge countryCode={pool.managerCountryCode} />
            {pool.managerVerified ? (
              <BadgeCheck
                className="h-4 w-4 shrink-0 text-[var(--id-accent-text)]"
                aria-label="Verified manager"
              />
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-[var(--id-text-muted)]">
            {pool.managerRating != null ? (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
                <span className="font-semibold text-[var(--id-text)]">
                  {pool.managerRating.toFixed(1)}
                </span>
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden />
              <span className="font-medium text-[var(--id-text-secondary)]">
                {pool.activeInvestors} Investors
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* 3. Divider */}
      <div className="mx-4 h-px bg-[var(--id-border)]" />

      {/* 4. Decision Metrics Row */}
      <div className="grid grid-cols-4 gap-1 px-3 py-3.5">
        <MobileMetricCell
          icon={Shield}
          iconClassName="text-emerald-600"
          iconBgClassName="bg-emerald-50 dark:bg-emerald-950/40"
          label="Risk Level"
          value={riskDisplay.label}
          valueClassName={riskDisplay.valueClassName}
        />
        <MobileMetricCell
          icon={Wallet}
          iconClassName="text-[var(--id-accent-text)]"
          iconBgClassName="bg-[var(--id-accent-soft)]"
          label="Min. Deposit"
          value={formatCurrency(pool.minInvestment)}
        />
        <MobileMetricCell
          icon={Clock}
          iconClassName="text-sky-600"
          iconBgClassName="bg-sky-50 dark:bg-sky-950/40"
          label="Payout Duration"
          value={pool.expectedDurationLabel}
        />
        <MobileMetricCell
          icon={RefreshCw}
          iconClassName="text-amber-600"
          iconBgClassName="bg-amber-50 dark:bg-amber-950/40"
          label="Cycle Status"
          value={cycleStatusLabel}
          valueClassName={cycleStatusTone(pool.activeCycle?.status)}
        />
      </div>

      {/* 5. Action Buttons */}
      <div className="grid grid-cols-[2fr_3fr] gap-2.5 px-4 pb-4 pt-0.5">
        <Button
          asChild
          variant="outline"
          className="h-11 rounded-xl border-[var(--id-accent)] text-sm font-medium text-[var(--id-accent-text)] hover:bg-[var(--id-accent-soft)]"
        >
          <Link href={`${ROUTES.marketplace}/${pool.slug}`}>View Details</Link>
        </Button>
        <Button
          asChild={!participateDisabled}
          disabled={participateDisabled}
          className={cn(
            "h-11 rounded-xl text-sm font-medium text-white shadow-sm",
            "[background:var(--id-accent-gradient)] hover:opacity-95 disabled:opacity-50"
          )}
        >
          {participateDisabled ? (
            <span>Participate in Pool</span>
          ) : (
            <Link href={`${ROUTES.marketplace}/${pool.slug}/join`}>Participate in Pool</Link>
          )}
        </Button>
      </div>
    </motion.article>
  );
}

function MobileMetricCell({
  icon: Icon,
  iconClassName,
  iconBgClassName,
  label,
  value,
  valueClassName,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClassName: string;
  iconBgClassName: string;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col items-center px-0.5 text-center">
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg",
          iconBgClassName
        )}
      >
        <Icon className={cn("h-4 w-4", iconClassName)} aria-hidden />
      </div>
      <p className="mt-1.5 text-[9px] leading-tight text-[var(--id-text-muted)]">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-[11px] font-bold leading-tight text-[var(--id-text)]",
          valueClassName
        )}
      >
        {value}
      </p>
    </div>
  );
}

function resolveRiskLabel(pool: MarketplacePoolCard): {
  label: string;
  valueClassName?: string;
} {
  if (pool.riskLevelTag) {
    const label = pool.riskLevelTag.replace(/\s+risk$/i, "").trim();
    return {
      label,
      valueClassName: riskToneFromLevel(pool.aggressivenessLevel),
    };
  }

  if (pool.aggressivenessLevel && AGGRESSIVENESS_LABELS[pool.aggressivenessLevel]) {
    return {
      label: AGGRESSIVENESS_LABELS[pool.aggressivenessLevel] ?? "—",
      valueClassName: riskToneFromLevel(pool.aggressivenessLevel),
    };
  }

  return { label: "—" };
}

function riskToneFromLevel(level: string | null | undefined): string | undefined {
  switch (level) {
    case "low":
      return "text-emerald-600";
    case "moderate":
      return "text-emerald-600";
    case "high":
      return "text-amber-600";
    case "extreme":
      return "text-red-600";
    default:
      return undefined;
  }
}

function cycleStatusTone(status: InvestmentCycleStatus | null | undefined): string | undefined {
  switch (status) {
    case "funding":
      return "text-amber-600";
    case "trading":
    case "approved":
      return "text-emerald-600";
    default:
      return undefined;
  }
}
