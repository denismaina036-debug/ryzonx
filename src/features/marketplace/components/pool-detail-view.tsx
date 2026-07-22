"use client";

import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import {
  AGGRESSIVENESS_LABELS,
  CAPACITY_STATUS_LABELS,
  POOL_HEALTH_LABELS,
  SECURITY_RATING_LABELS,
} from "@/constants/marketplace";
import { PROTECTION_INDICATOR_LABELS } from "@/constants/governance";
import { PerformanceChart } from "@/components/ui/chart";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { poolCoverBannerStyle } from "@/domain/pools/cover-image-position";
import { Button } from "@/components/ui/button";
import { MarketplacePoolCardView } from "@/features/marketplace/components/marketplace-pool-card";
import {
  MarketplaceBreadcrumb,
  managerProfileCrumb,
  marketplaceHomeCrumb,
  opportunityCrumb,
} from "@/features/marketplace/components/marketplace-breadcrumb";
import type {
  MarketplaceActivityItem,
  MarketplaceInvestorStats,
  MarketplaceJournalEntry,
  MarketplacePerformanceAnalytics,
  MarketplacePoolDetail,
  MarketplacePoolCard,
} from "@/domain/marketplace/types";
import { INVESTMENT_CYCLE_STATUS_LABELS } from "@/constants/investment-cycle";
import { TRADE_ENTRY_DIRECTION_LABELS } from "@/constants/trade-entry";
import { formatFundingPeriodCountdown } from "@/features/marketplace/utils/funding-countdown";
import { formatTradingDateTimeLabel } from "@/domain/pools/trading-session";
import { formatFixedReturnRowLabel } from "@/domain/pools/fixed-return";
import { MANAGED_POOL_RETURN_MODEL_LABELS } from "@/domain/pools/return-model";

interface PoolDetailViewProps {
  pool: MarketplacePoolDetail;
  performance: MarketplacePerformanceAnalytics;
  journal: MarketplaceJournalEntry[];
  investorStats: MarketplaceInvestorStats;
  activity: MarketplaceActivityItem[];
  relatedPools: MarketplacePoolCard[];
}

export function PoolDetailView({
  pool,
  performance,
  journal,
  investorStats,
  activity: _activity,
  relatedPools,
}: PoolDetailViewProps) {
  const chartData = performance.historicalGrowth.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: d.poolValue,
  }));

  return (
    <div className="space-y-10">
      <MarketplaceBreadcrumb
        items={[
          marketplaceHomeCrumb(),
          ...(pool.managerSlug && pool.managerName
            ? [managerProfileCrumb(pool.managerSlug, pool.managerName)]
            : []),
          opportunityCrumb(pool.slug, pool.name),
        ]}
      />

      {/* Hero */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div
          className="relative h-48 bg-cover sm:h-64"
          style={poolCoverBannerStyle({
            coverImageUrl: pool.coverImageUrl,
            cardBackgroundColor: pool.cardBackgroundColor,
            coverImagePosition: pool.coverImagePosition,
          })}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <h1 className="text-2xl font-bold text-white sm:text-4xl">{pool.name}</h1>
            {pool.tagline && <p className="mt-1 text-white/80">{pool.tagline}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-3">
            {pool.managerPhotoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pool.managerPhotoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
            )}
            <div>
              {pool.managerSlug ? (
                <Link
                  href={`${ROUTES.managerPublicProfile}/${pool.managerSlug}`}
                  className="font-semibold text-[var(--id-text)] hover:text-[var(--id-accent-text)]"
                >
                  {pool.managerName}
                </Link>
              ) : (
                <p className="font-semibold text-[var(--id-text)]">{pool.managerName}</p>
              )}
              <div className="flex items-center gap-1 text-sm text-[var(--id-text-muted)]">
                {pool.managerVerified && <BadgeCheck className="h-4 w-4 text-[var(--id-accent-text)]" />}
                Manager · {pool.tradingPair}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {pool.canParticipate ? (
              <Button asChild>
                <Link href={`${ROUTES.marketplace}/${pool.slug}/join`}>Participate</Link>
              </Button>
            ) : (
              <Button disabled variant="outline">
                Participate
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-[var(--id-text)]">Current Investment Cycle</h2>
        {pool.activeCycle ? (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-[var(--id-text)]">
                  Cycle {pool.activeCycle.cycleNumber}
                  {pool.activeCycle.name ? ` — ${pool.activeCycle.name}` : ""}
                </p>
                <p className="text-sm text-[var(--id-text-muted)]">
                  {INVESTMENT_CYCLE_STATUS_LABELS[pool.activeCycle.status] ??
                    pool.activeCycle.status}
                </p>
                <p className="mt-1 text-xs text-[var(--id-text-muted)]">
                  Funding Start:{" "}
                  {formatTradingDateTimeLabel(
                    pool.activeCycle.fundingStartedAt ??
                      pool.activeCycle.openingDate ??
                      undefined
                  ) ?? "—"}
                </p>
              </div>
              {pool.canParticipate && (
                <Button asChild size="sm">
                  <Link href={`${ROUTES.marketplace}/${pool.slug}/join`}>Participate</Link>
                </Button>
              )}
            </div>
            {formatFundingPeriodCountdown(pool) && (
              <div className="rounded-lg bg-[var(--id-surface-muted)] px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-[var(--id-text-faint)]">
                  Starts In
                </p>
                <p className="mt-1 text-lg font-semibold text-[var(--id-text)]">
                  {formatFundingPeriodCountdown(pool)}
                </p>
              </div>
            )}
            {pool.activeCycle.status === "trading" && (
              <div className="rounded-lg border border-border px-4 py-3">
                <p className="text-sm font-semibold text-[var(--id-text)]">Running Active Trades</p>
                {pool.activeOpenTrades.length > 0 ? (
                  <>
                    <ul className="mt-2 space-y-1 text-sm text-[var(--id-text-secondary)]">
                      {pool.activeOpenTrades.map((trade, index) => (
                        <li key={`${trade.instrument}-${index}`}>
                          {trade.instrument}{" "}
                          {TRADE_ENTRY_DIRECTION_LABELS[
                            trade.direction as keyof typeof TRADE_ENTRY_DIRECTION_LABELS
                          ] ?? trade.direction}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-[var(--id-text-muted)]">
                      {pool.activeOpenTrades.length} active trade
                      {pool.activeOpenTrades.length === 1 ? "" : "s"}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-[var(--id-text-muted)]">All Trades Closed</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--id-text-muted)]">
            No investment cycle is currently accepting new participants.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-[var(--id-text)]">Trading Details</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
          <Row label="Trading Session" value={pool.tradingSessionLabel ?? "—"} />
          <Row label="Trading Date & Time" value={formatTradingDateTimeLabel(pool.tradingTimeNy ?? undefined) ?? "—"} />
          <Row
            label="Markets Traded"
            value={
              pool.marketsTradedCodes.length > 0
                ? pool.marketsTradedCodes.join(", ")
                : pool.marketTypeCode ?? "—"
            }
          />
          <Row
            label="Trading Instruments"
            value={
              pool.tradingInstrumentCodes.length > 0
                ? pool.tradingInstrumentCodes
                    .map((code) => code.split(":").pop()?.replace(/_/g, " ") ?? code)
                    .join(", ")
                : pool.tradingInstrumentCode ?? pool.tradingPair ?? "—"
            }
          />
          <Row label="Return Model" value={MANAGED_POOL_RETURN_MODEL_LABELS[pool.returnModel]} />
        </dl>
      </section>

      {pool.returnModel === "fixed" && pool.fixedReturnRows.length > 0 && (
        <section id="return-structure" className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-[var(--id-text)]">Fixed Return Schedule</h2>
          <div className="mt-3 space-y-2">
            {pool.fixedReturnRows.map((row, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-2 text-sm"
              >
                <span className="text-[var(--id-text-secondary)]">
                  {formatCurrency(row.investmentAmount)}
                </span>
                <span className="font-medium text-[var(--id-text)]">
                  {formatFixedReturnRowLabel(row)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {pool.returnModel === "variable" && pool.returnTiers.length > 0 && (
        <section id="return-structure" className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-[var(--id-text)]">Variable Return Tiers</h2>
          <div className="mt-3 space-y-2">
            {pool.returnTiers.map((tier, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-2 text-sm"
              >
                <span className="text-[var(--id-text-secondary)]">
                  {formatCurrency(tier.minAmount)}
                  {tier.maxAmount != null ? ` – ${formatCurrency(tier.maxAmount)}` : "+"}
                </span>
                <span className="font-medium text-[var(--id-text)]">
                  {formatPercentage(tier.returnPct)} expected return
                </span>
              </div>
            ))}
          </div>
          <dl className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2 text-sm">
            <Row label="Investor Share" value={`${Math.round(pool.investorSharePct)}%`} />
            <Row label="Pool Manager Share" value={`${Math.round(pool.poolManagerSharePct)}%`} />
          </dl>
        </section>
      )}

      {pool.poolHealth === "suspended" && pool.suspensionReason && (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-5">
          <h2 className="font-semibold text-rose-900">Suspended by RyvonX</h2>
          <p className="mt-2 text-sm text-rose-800">{pool.suspensionReason}</p>
          {pool.suspendedAt && (
            <p className="mt-1 text-xs text-rose-600">
              {new Date(pool.suspendedAt).toLocaleDateString()}
            </p>
          )}
        </section>
      )}

      {pool.protectionIndicators.length > 0 && (
        <section className="rounded-xl border border-[var(--id-accent)]/20 bg-[var(--id-accent-soft)] p-5">
          <h2 className="text-sm font-semibold text-[var(--id-text)]">Investor Protection</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {pool.protectionIndicators.map((ind) => (
              <span
                key={ind}
                className="rounded-full bg-[var(--id-surface)] px-3 py-1 text-xs font-medium text-[var(--id-accent-text)] shadow-sm"
              >
                {PROTECTION_INDICATOR_LABELS[ind] ?? ind}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-[var(--id-text)]">Capital Transparency</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CapitalStat label="Investor Capital" value={formatCurrency(pool.investorCapital)} sub={`${pool.investorPct}% of pool capital`} />
          <CapitalStat label="RyvonX Capital" value={formatCurrency(pool.ryvonxCapital)} sub={`${pool.ryvonxPct}% of pool capital`} />
          <CapitalStat label="Total Capital" value={formatCurrency(pool.assetsUnderManagement)} sub={`${pool.activeInvestors} investors`} />
          <CapitalStat label="Growth Rate" value={pool.growthRatePct != null ? formatPercentage(pool.growthRatePct) : "—"} sub={pool.capacityStatus} />
        </div>
        {pool.isRyvonxBacked && (
          <p className="mt-3 text-xs text-[var(--id-accent-text)] italic">
            This pool receives RyvonX company capital — verified by the RyvonX Capital Committee.
          </p>
        )}
      </section>

      {/* Ratings row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="RyvonX Rating" value={pool.ryvonxRating?.toFixed(1) ?? "—"} />
        <StatCard
          label="Security"
          value={
            pool.securityRating
              ? (SECURITY_RATING_LABELS[pool.securityRating] ?? pool.securityRating)
              : "—"
          }
        />
        <StatCard
          label="Aggressiveness"
          value={
            pool.aggressivenessLevel
              ? (AGGRESSIVENESS_LABELS[pool.aggressivenessLevel] ?? pool.aggressivenessLevel)
              : "—"
          }
        />
        <StatCard
          label="Pool Health"
          value={POOL_HEALTH_LABELS[pool.poolHealth] ?? pool.poolHealth}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <Section title="Pool Overview">
            <p className="text-[var(--id-text-secondary)] whitespace-pre-wrap leading-relaxed">
              {pool.poolDescription || pool.description}
            </p>
          </Section>

          <Section title="Performance">
            <PerformanceChart data={chartData} type="area" height={280} />
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
              <MiniStat label="Total ROI" value={formatPercentage(performance.totalRoiPct)} />
              <MiniStat label="Monthly" value={formatPercentage(performance.monthlyReturnPct)} />
              <MiniStat label="Best Month" value={performance.bestMonthPct != null ? formatPercentage(performance.bestMonthPct) : "—"} />
              <MiniStat label="Winning Months" value={String(performance.winningMonths)} />
            </div>
          </Section>

          <Section title="Trading Journal">
            {journal.length === 0 ? (
              <p className="text-sm text-[var(--id-text-faint)]">No published trades yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-[var(--id-text-faint)]">
                      <th className="pb-2 pr-4">Asset</th>
                      <th className="pb-2 pr-4">Direction</th>
                      <th className="pb-2 pr-4">ROI</th>
                      <th className="pb-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {journal.map((t) => (
                      <tr key={t.id} className="border-b border-border/50">
                        <td className="py-2.5 font-medium">{t.asset}</td>
                        <td className="py-2.5 capitalize">{t.direction}</td>
                        <td className="py-2.5">
                          {t.roiPct != null ? formatPercentage(t.roiPct) : "—"}
                        </td>
                        <td className="py-2.5 text-[var(--id-text-muted)]">
                          {t.date ? new Date(t.date).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {pool.faq.length > 0 && (
            <Section title="FAQ">
              <dl className="space-y-4">
                {pool.faq.map((item, i) => (
                  <div key={i}>
                    <dt className="font-medium text-[var(--id-text)]">{item.question}</dt>
                    <dd className="mt-1 text-sm text-[var(--id-text-secondary)]">{item.answer}</dd>
                  </div>
                ))}
              </dl>
            </Section>
          )}
        </div>

        <aside className="space-y-6">
          <Section title="Investment Requirements">
            <dl className="space-y-3 text-sm">
              <Row label="Minimum" value={formatCurrency(pool.minInvestment)} />
              <Row label="Suggested" value={formatCurrency(pool.suggestedInvestment)} />
              <Row
                label="Duration"
                value={pool.poolDurationDays ? `${pool.poolDurationDays} days` : "Flexible"}
              />
              <Row
                label="Capacity"
                value={CAPACITY_STATUS_LABELS[pool.capacityStatus] ?? pool.capacityStatus}
              />
            </dl>
            {pool.riskSummary && (
              <p className="mt-4 text-xs text-[var(--id-text-muted)] leading-relaxed">{pool.riskSummary}</p>
            )}
          </Section>

          <Section title="Investor Statistics">
            <dl className="space-y-3 text-sm">
              <Row label="Investors" value={String(investorStats.currentInvestors)} />
              <Row label="Total capital" value={formatCurrency(investorStats.totalCapital)} />
              <Row label="Avg. investment" value={formatCurrency(investorStats.averageInvestment)} />
              <Row label="Recent deposits" value={String(investorStats.recentDepositCount)} />
            </dl>
            <p className="mt-3 text-[10px] text-[var(--id-text-faint)]">
              Individual investor identities are never shown.
            </p>
          </Section>

          {pool.adminComments && (
            <Section title="RyvonX Notes">
              <p className="text-sm text-[var(--id-text-secondary)]">{pool.adminComments}</p>
            </Section>
          )}

          {pool.manager && (
            <Section title="Manager">
              <Link
                href={`${ROUTES.managerPublicProfile}/${pool.manager.slug}`}
                className="text-sm font-medium text-[var(--id-accent-text)] hover:underline"
              >
                View full profile →
              </Link>
            </Section>
          )}
        </aside>
      </div>

      {relatedPools.length > 0 && (
        <Section
          title={
            pool.managerSlug
              ? "More opportunities from this manager"
              : "More investment opportunities"
          }
        >
          <div className="grid gap-6 sm:grid-cols-2">
            {relatedPools.slice(0, 2).map((p) => (
              <MarketplacePoolCardView key={p.id} pool={p} compact />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="mb-4 text-lg font-semibold text-[var(--id-text)]">{title}</h2>
      {children}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-center">
      <p className="text-xs text-[var(--id-text-faint)]">{label}</p>
      <p className="mt-1 text-xl font-bold text-[var(--id-text)]">{value}</p>
    </div>
  );
}

function CapitalStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-[var(--id-surface-muted)] px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-[var(--id-text-faint)]">{label}</p>
      <p className="mt-1 text-lg font-bold text-[var(--id-text)]">{value}</p>
      {sub && <p className="text-xs text-[var(--id-text-muted)]">{sub}</p>}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[var(--id-text-faint)]">{label}</p>
      <p className="font-semibold text-[var(--id-text)]">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-[var(--id-text-muted)]">{label}</dt>
      <dd className="font-medium text-[var(--id-text)]">{value}</dd>
    </div>
  );
}
