"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, ShieldCheck } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { formatCurrency, formatSignedCurrency, cn } from "@/lib/utils";
import { PoolCoverBanner } from "@/features/marketplace/components/pool-cover-banner";
import { ManagerCountryBadge } from "@/features/marketplace/components/manager-country-badge";
import { Button } from "@/components/ui/button";
import type { MarketplacePoolDetail } from "@/domain/marketplace/types";
import { formatInstrumentTicker } from "@/domain/reference-data/instrument-display";
import { formatMultiplier } from "@/domain/roi/calculator";
import { formatInvestmentLevelRange } from "@/features/pool-manager/components/managed-pool/pm-roi-multiplier-editor";
import { shouldShowPoolTagline, resolvePoolAboutText } from "@/features/marketplace/utils/marketplace-pool-card-presentation";
import { isCycleFundingPhase, isCycleTradingPhase } from "@/lib/investment/cycle-display-phase";
import { LiveRoiPreview, RoiDisclaimerBlock } from "@/features/roi/components/live-roi-preview";
import { InvestorCycleTradeFeed } from "@/features/investor/components/investment/investor-cycle-trade-feed";
import { Input } from "@/components/ui/input";

interface PoolDetailViewProps {
  pool: MarketplacePoolDetail;
}

function formatTradedInstruments(pool: MarketplacePoolDetail): string {
  if (pool.tradingInstrumentCodes.length > 0) {
    return pool.tradingInstrumentCodes
      .map((code) => formatInstrumentTicker(code))
      .join(", ");
  }
  return formatInstrumentTicker(pool.tradingInstrumentCode ?? pool.tradingPair ?? null);
}

export function PoolDetailView({ pool }: PoolDetailViewProps) {
  const [previewAmount, setPreviewAmount] = useState(String(pool.minInvestment));

  const parsedPreviewAmount = useMemo(() => {
    const num = Number(previewAmount);
    return Number.isFinite(num) && num > 0 ? num : 0;
  }, [previewAmount]);

  const displayName = pool.displayPoolName || pool.name;
  const tradedLabel = formatTradedInstruments(pool);
  const aboutText = resolvePoolAboutText({
    poolDescription: pool.poolDescription,
    description: pool.description,
    tagline: pool.tagline,
    displayName,
    poolName: pool.name,
  });
  const isHealthy = pool.poolHealth === "healthy";
  const showActiveSignal = Boolean(pool.activeCycle && pool.canParticipate);
  const isTrading =
    pool.activeCycle != null && isCycleTradingPhase(pool.activeCycle.status);
  const isFunding =
    pool.activeCycle != null && isCycleFundingPhase(pool.activeCycle.status);

  return (
    <div className="space-y-6 sm:space-y-8">
      <Link
        href={ROUTES.marketplace}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--id-text-muted)] transition-colors hover:text-[var(--id-text)]"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" />
        Marketplace
      </Link>

      {/* Hero — single pool title, manager with flag */}
      <header className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--id-text)] sm:text-3xl">
              {displayName}
            </h1>
            {pool.poolVerified && (
              <BadgeCheck
                className="h-5 w-5 shrink-0 text-[var(--id-accent-text)]"
                aria-label="RyvonX approved"
              />
            )}
          </div>
          {shouldShowPoolTagline(pool.tagline, displayName, pool.name) && (
            <p className="max-w-2xl text-sm text-[var(--id-text-muted)] sm:text-base">
              {pool.tagline}
            </p>
          )}
          {pool.managerName && (
            <p className="flex flex-wrap items-center gap-2 text-sm text-[var(--id-text-muted)]">
              <span>Managed by</span>
              {pool.managerSlug ? (
                <Link
                  href={`${ROUTES.managerPublicProfile}/${pool.managerSlug}`}
                  className="inline-flex items-center gap-1.5 font-medium text-[var(--id-text)] hover:text-[var(--id-accent-text)]"
                >
                  <span>{pool.managerName}</span>
                  <ManagerCountryBadge countryCode={pool.managerCountryCode} size="md" />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-medium text-[var(--id-text)]">
                  <span>{pool.managerName}</span>
                  <ManagerCountryBadge countryCode={pool.managerCountryCode} size="md" />
                </span>
              )}
            </p>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-[var(--id-border)]">
          <PoolCoverBanner
            coverImageUrl={pool.coverImageUrl}
            cardBackgroundColor={pool.cardBackgroundColor}
            coverImagePosition={pool.coverImagePosition}
            className="relative h-24 sm:h-28"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </PoolCoverBanner>
        </div>
      </header>

      {/* Trust signals */}
      {(isHealthy || pool.poolVerified) && (
        <div className="flex flex-wrap gap-2">
          {isHealthy && (
            <TrustBadge icon={ShieldCheck} label="Pool is healthy" variant="healthy" />
          )}
          {pool.poolVerified && (
            <TrustBadge icon={BadgeCheck} label="Approved by RyvonX" variant="verified" />
          )}
        </div>
      )}

      {/* Current investment cycle */}
      <section className="rounded-xl border border-[var(--id-border)] bg-[var(--id-surface)] p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--id-text-faint)]">
          Current Investment Cycle
        </p>

        {pool.activeCycle ? (
          <div className="mt-4 space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-4">
                <div>
                  {showActiveSignal && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                      Active — open for investment
                    </div>
                  )}
                </div>

                <dl className="grid gap-3 sm:grid-cols-2">
                  <DetailItem label="Traded" value={tradedLabel} />
                  {pool.tradingScheduleLabel ? (
                    <DetailItem label="Trading Time" value={pool.tradingScheduleLabel} />
                  ) : null}
                  {pool.tradingSessionLabel ? (
                    <DetailItem label="Trading Session" value={pool.tradingSessionLabel} />
                  ) : null}
                  <DetailItem
                    label={isTrading ? "Capital Traded" : "Total Capital"}
                    value={formatCurrency(pool.raisedCapital)}
                  />
                  {isTrading && pool.targetCapital > 0 ? (
                    <DetailItem
                      label="Total Capital Under Management"
                      value={formatCurrency(pool.targetCapital)}
                    />
                  ) : null}
                  {pool.activeCycle ? (
                    <DetailItem
                      label="Investors"
                      value={String(pool.cycleParticipantCount)}
                    />
                  ) : null}
                </dl>
              </div>

              <div className="flex flex-col gap-2 sm:mt-1 sm:shrink-0 sm:items-stretch">
                {pool.canParticipate && (
                  <Button asChild size="lg" className="h-11 px-8">
                    <Link href={`${ROUTES.marketplace}/${pool.slug}/join`}>Invest in Pool</Link>
                  </Button>
                )}
                <Button asChild variant="outline" size="lg" className="h-11 px-8">
                  <Link href={`${ROUTES.marketplace}/${pool.slug}/activity`}>
                    Pool Activity
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            <p className="text-sm text-[var(--id-text-muted)]">
              No investment cycle is currently accepting new participants.
            </p>
            <Button asChild variant="outline" size="lg" className="h-11 w-fit px-8">
              <Link href={`${ROUTES.marketplace}/${pool.slug}/activity`}>
                Pool Activity
              </Link>
            </Button>
          </div>
        )}
      </section>

      {/* Pool performance */}
      <section className="rounded-xl border border-[var(--id-border)] bg-[var(--id-surface)] p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--id-text-faint)]">
          Pool Performance
        </p>
        <p
          className={cn(
            "mt-3 text-2xl font-semibold tabular-nums sm:text-3xl",
            pool.poolRealizedProfit > 0 && "text-emerald-600 dark:text-emerald-400",
            pool.poolRealizedProfit < 0 && "text-rose-600 dark:text-rose-400",
            pool.poolRealizedProfit === 0 && "text-[var(--id-text)]"
          )}
        >
          {formatSignedCurrency(pool.poolRealizedProfit)}
        </p>
        <p className="mt-1 text-sm text-[var(--id-text-muted)]">
          Total profit realized in this pool
        </p>
      </section>

      {pool.publicTrades.length > 0 && pool.activeCycle && (
        <InvestorCycleTradeFeed
          trades={pool.publicTrades}
          cycleStatus={pool.activeCycle.status}
        />
      )}

      {pool.roiMultipliers.length > 0 && (
        <section
          id="return-structure"
          className="rounded-xl border border-[var(--id-border)] bg-[var(--id-surface)] p-5 sm:p-6"
        >
          <h2 className="text-sm font-semibold text-[var(--id-text)]">
            Investment Levels & ROI Targets
          </h2>
          <p className="mt-1 text-xs text-[var(--id-text-muted)]">
            Projected ROI multipliers set by the Pool Manager for each platform investment level.
          </p>
          <div className="mt-4 space-y-2">
            {pool.roiMultipliers.map((entry) => {
              const level =
                entry.level ??
                pool.investmentLevels.find((l) => l.id === entry.investmentLevelId);
              return (
                <div
                  key={entry.investmentLevelId}
                  className="flex items-center justify-between rounded-lg border border-[var(--id-border)] px-4 py-3 text-sm"
                >
                  <div>
                    <span className="font-medium text-[var(--id-text)]">
                      {level?.name ?? "Investment Level"}
                    </span>
                    {level && (
                      <p className="text-xs text-[var(--id-text-muted)]">
                        {formatInvestmentLevelRange(level)}
                      </p>
                    )}
                  </div>
                  <span className="text-lg font-bold tabular-nums text-[var(--id-accent-text)]">
                    {formatMultiplier(entry.multiplier)}
                  </span>
                </div>
              );
            })}
          </div>
          <RoiDisclaimerBlock className="mt-4" />
        </section>
      )}

      {pool.canParticipate && (
        <section className="rounded-xl border border-[var(--id-border)] bg-[var(--id-surface)] p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-[var(--id-text)]">Preview Your Investment</h2>
          <p className="mt-1 text-xs text-[var(--id-text-muted)]">
            Enter an amount to see projected returns update instantly.
          </p>
          <div className="mt-4 grid gap-5 lg:grid-cols-2 lg:items-start">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">
                Investment Amount
              </label>
              <Input
                type="number"
                min={pool.minInvestment}
                value={previewAmount}
                onChange={(e) => setPreviewAmount(e.target.value)}
                className="mt-1 h-11"
              />
            </div>
            <LiveRoiPreview
              amount={parsedPreviewAmount}
              levels={pool.investmentLevels}
              multipliers={pool.roiMultipliers}
              returnDurationPreset={pool.returnDurationPreset}
              returnDurationValue={pool.returnDurationValue}
              returnDurationUnit={pool.returnDurationUnit}
            />
          </div>
        </section>
      )}

      {pool.poolHealth === "suspended" && pool.suspensionReason && (
        <section className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 sm:p-6">
          <h2 className="font-semibold text-[var(--id-danger)]">Suspended by RyvonX</h2>
          <p className="mt-2 text-sm text-[var(--id-text-secondary)]">{pool.suspensionReason}</p>
          {pool.suspendedAt && (
            <p className="mt-1 text-xs text-[var(--id-text-muted)]">
              {new Date(pool.suspendedAt).toLocaleDateString()}
            </p>
          )}
        </section>
      )}

      {aboutText && (
        <section className="rounded-xl border border-[var(--id-border)] bg-[var(--id-surface)] p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-[var(--id-text)]">About this pool</h2>
          <p className="mt-3 whitespace-pre-wrap text-wrap-pretty text-sm leading-relaxed text-[var(--id-text-secondary)]">
            {aboutText}
          </p>
        </section>
      )}
    </div>
  );
}

function TrustBadge({
  icon: Icon,
  label,
  variant,
}: {
  icon: typeof ShieldCheck;
  label: string;
  variant: "healthy" | "verified";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
        variant === "healthy"
          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "border-[var(--id-accent)]/25 bg-[var(--id-accent-soft)] text-[var(--id-accent-text)]"
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-[var(--id-text-faint)]">
        {label}
      </dt>
      <dd className="mt-1 text-base font-medium text-[var(--id-text)]">{value}</dd>
    </div>
  );
}
