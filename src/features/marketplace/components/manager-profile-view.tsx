"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Award,
  BadgeCheck,
  Calendar,
  Globe,
  Link2,
  MapPin,
  Shield,
  Star,
  TrendingUp,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { MANAGER_LEVEL_LABELS } from "@/constants/capital-allocation";
import { PROTECTION_INDICATOR_LABELS } from "@/constants/governance";
import { Button } from "@/components/ui/button";
import { MarketplacePoolCardView } from "@/features/marketplace/components/marketplace-pool-card";
import {
  MarketplaceBreadcrumb,
  managerProfileCrumb,
  marketplaceHomeCrumb,
} from "@/features/marketplace/components/marketplace-breadcrumb";
import { formatCurrency, formatPercentage, cn } from "@/lib/utils";
import type {
  MarketplaceJournalEntry,
  MarketplacePoolCard,
} from "@/domain/marketplace/types";
import type { InvestorCycleCard, InvestorStrategyCard } from "@/domain/investment/investor-presentation";
import { InvestorRatingPanel } from "@/features/performance-intelligence/components/performance-intelligence-panels";
import type { InvestorRatingView } from "@/domain/performance-intelligence/types";
import { MarketplaceStrategyCard } from "@/features/marketplace/components/investment-marketplace-cards";
import type { PoolManagerPublicProfile } from "@/domain/pool-manager/types";
import { PM_SOCIAL_PLATFORMS } from "@/domain/pool-manager/public-profile";

const PROFILE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "strategies", label: "Strategies" },
  { id: "cycles", label: "Active Pools" },
  { id: "ratings", label: "Ratings" },
  { id: "opportunities", label: "Legacy Pools" },
  { id: "journal", label: "Journal" },
  { id: "reviews", label: "Reviews" },
] as const;

type ProfileTab = (typeof PROFILE_TABS)[number]["id"];

interface ManagerProfileViewProps {
  profile: PoolManagerPublicProfile;
  managedPools: MarketplacePoolCard[];
  journalEntries: MarketplaceJournalEntry[];
  strategies: InvestorStrategyCard[];
  cycles: InvestorCycleCard[];
  investorRating?: InvestorRatingView | null;
}

export function ManagerProfileView({
  profile,
  managedPools,
  journalEntries,
  strategies,
  cycles: _cycles,
  investorRating,
}: ManagerProfileViewProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");

  const stats = [
    {
      label: "Win Rate",
      value: profile.winRatePct != null ? formatPercentage(profile.winRatePct) : "—",
    },
    {
      label: "Avg Monthly Return",
      value:
        profile.avgMonthlyReturnPct != null
          ? formatPercentage(profile.avgMonthlyReturnPct)
          : "—",
    },
    {
      label: "Max Drawdown",
      value:
        profile.maxDrawdownPct != null ? formatPercentage(profile.maxDrawdownPct) : "—",
    },
    { label: "Verified Trades", value: String(profile.publicTradeCount) },
    { label: "Reviews", value: String(profile.publicReviewCount) },
    { label: "Capital", value: formatCurrency(profile.assetsUnderManagement) },
    { label: "Active Investors", value: String(profile.activeInvestors) },
    { label: "Opportunities", value: String(profile.poolsManaged) },
  ];

  const ratings = [
    { label: "RyvonX Rating", value: profile.ryvonxRating, max: 5 },
    { label: "Security", value: profile.securityRating, max: 5 },
    { label: "Aggressiveness", value: profile.aggressivenessRating, max: 5 },
  ].filter((r) => r.value != null);

  const governanceIndicators = [
    ...new Set(managedPools.flatMap((p) => p.protectionIndicators)),
  ];

  const featuredOpportunity = managedPools.find(
    (p) => p.capacityStatus === "open" || p.capacityStatus === "nearly_full"
  ) ?? managedPools[0];

  return (
    <div className="space-y-8 pb-8">
      <MarketplaceBreadcrumb
        items={[
          marketplaceHomeCrumb(),
          managerProfileCrumb(profile.slug, profile.publicDisplayName),
        ]}
      />

      <section className="overflow-hidden rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-[var(--id-shadow)]">
        <div className="relative h-40 sm:h-52">
          {profile.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.coverImageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full bg-gradient-to-br from-indigo-900/40 via-[var(--id-surface-elevated)] to-[var(--id-bg)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--id-surface)] via-transparent to-transparent" />
        </div>

        <div className="relative px-6 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-[var(--id-surface)] bg-[var(--id-surface-muted)] shadow-lg">
                {profile.profilePhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.profilePhotoUrl}
                    alt={profile.publicDisplayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-3xl font-bold text-[var(--id-accent-text)]">
                    {profile.publicDisplayName.charAt(1) || profile.publicDisplayName.charAt(0)}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold text-[var(--id-text)] sm:text-3xl">
                    {profile.publicDisplayName}
                  </h1>
                  {profile.isVerified && (
                    <BadgeCheck className="h-6 w-6 text-[var(--id-accent)]" aria-label="Verified" />
                  )}
                </div>
                {profile.fullName && (
                  <p className="mt-1 text-base text-[var(--id-text-secondary)]">{profile.fullName}</p>
                )}
                <p className="mt-1 text-sm text-[var(--id-text-muted)]">
                  Professional Pool Manager
                </p>
                {Object.keys(profile.publicSocialLinks).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {PM_SOCIAL_PLATFORMS.filter((p) => profile.publicSocialLinks[p.key]?.url).map(
                      (platform) => (
                        <a
                          key={platform.key}
                          href={profile.publicSocialLinks[platform.key]!.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--id-border)] bg-[var(--id-surface-muted)] px-3 py-1 text-xs font-medium text-[var(--id-text-secondary)] transition hover:border-[var(--id-accent)] hover:text-[var(--id-accent-text)]"
                        >
                          <Link2 className="h-3.5 w-3.5" />
                          {platform.label}
                        </a>
                      )
                    )}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--id-text-secondary)]">
                  {profile.managerLevel && (
                    <span className="rounded-full bg-[var(--id-accent-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--id-accent-text)]">
                      {MANAGER_LEVEL_LABELS[profile.managerLevel] ?? profile.managerLevel}
                    </span>
                  )}
                  {profile.country && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {profile.country}
                    </span>
                  )}
                  {profile.tradingStyle && (
                    <span className="inline-flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" />
                      {profile.tradingStyle}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {profile.yearsOnRyvonX} yrs on RyvonX
                  </span>
                </div>
                {profile.tradingSince && (
                  <p className="mt-1 text-xs text-[var(--id-text-muted)]">
                    Trading since{" "}
                    {new Date(profile.tradingSince).toLocaleDateString("en-GB", {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>

            {featuredOpportunity && (
              <Button asChild className="shrink-0 rounded-xl">
                <Link href={`${ROUTES.marketplace}/${featuredOpportunity.slug}`}>
                  View Active Opportunity
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] px-4 py-4 text-center shadow-[var(--id-shadow)]"
          >
            <p className="text-[10px] uppercase tracking-wider text-[var(--id-text-muted)]">
              {s.label}
            </p>
            <p className="mt-1.5 text-lg font-semibold tabular-nums text-[var(--id-text)]">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {PROFILE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-[var(--id-accent)] text-white"
                : "text-[var(--id-text-muted)] hover:bg-[var(--id-surface-muted)]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Section title="Biography">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--id-text-secondary)]">
                {profile.biography?.trim() || "No biography provided yet."}
              </p>
            </Section>

            {profile.markets.length > 0 && (
              <Section title="Markets Traded" icon={Globe}>
                <div className="flex flex-wrap gap-2">
                  {profile.markets.map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-[var(--id-surface-muted)] px-3 py-1 text-xs font-medium text-[var(--id-text-secondary)]"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {profile.achievements.length > 0 && (
              <Section title="Achievements" icon={Award}>
                <ul className="space-y-3">
                  {profile.achievements.map((a) => (
                    <li
                      key={a.title + a.awardedAt}
                      className="flex items-center justify-between rounded-xl bg-[var(--id-surface-muted)] px-4 py-3"
                    >
                      <span className="text-sm font-medium text-[var(--id-text)]">{a.title}</span>
                      <span className="text-xs text-[var(--id-text-muted)]">
                        {new Date(a.awardedAt).toLocaleDateString("en-GB", {
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title="Historical Performance">
              <p className="text-sm text-[var(--id-text-muted)]">
                Cycle-linked performance analytics and verified track records will appear here when
                the Trading Engine phase delivers live trading data. Current ratings are display-only
                placeholders.
              </p>
            </Section>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[var(--id-radius)] border border-[var(--id-accent)]/20 bg-[var(--id-accent-soft)] p-6">
              <Shield className="h-8 w-8 text-[var(--id-accent-text)]" />
              <h3 className="mt-3 font-semibold text-[var(--id-text)]">RyvonX Verified Manager</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--id-text-secondary)]">
                Approved Pool Manager under RyvonX administration.
                {profile.approvedAt &&
                  ` Verified ${new Date(profile.approvedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}.`}
              </p>
            </div>
            {governanceIndicators.length > 0 && (
              <Section title="Governance">
                <div className="flex flex-wrap gap-1.5">
                  {governanceIndicators.map((ind) => (
                    <span
                      key={ind}
                      className="rounded-full bg-[var(--id-surface-muted)] px-2.5 py-1 text-xs text-[var(--id-text-secondary)]"
                    >
                      {PROTECTION_INDICATOR_LABELS[ind] ?? ind}
                    </span>
                  ))}
                </div>
              </Section>
            )}
          </aside>
        </div>
      )}

      {activeTab === "ratings" && (
        <div className="space-y-6">
          {investorRating && <InvestorRatingPanel rating={investorRating} />}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ratings.map((r) => (
            <div
              key={r.label}
              className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5"
            >
              <p className="text-sm text-[var(--id-text-muted)]">{r.label}</p>
              <p className="mt-2 inline-flex items-center gap-1 text-2xl font-semibold text-[var(--id-text)]">
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                {r.value!.toFixed(1)}
                <span className="text-sm font-normal text-[var(--id-text-faint)]">/ {r.max}</span>
              </p>
            </div>
          ))}
          {ratings.length === 0 && !investorRating && (
            <p className="text-sm text-[var(--id-text-muted)]">No ratings available yet.</p>
          )}
          </div>
        </div>
      )}

      {activeTab === "strategies" && (
        <div>
          <p className="mb-4 text-sm text-[var(--id-text-muted)]">
            Investment strategies defined by {profile.publicDisplayName}.
          </p>
          {strategies.length === 0 ? (
            <p className="text-sm text-[var(--id-text-muted)]">No public strategies yet.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {strategies.map((strategy) => (
                <MarketplaceStrategyCard key={strategy.id} strategy={strategy} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "cycles" && (
        <div>
          <p className="mb-4 text-sm text-[var(--id-text-muted)]">
            Live pools managed by {profile.publicDisplayName}.
          </p>
          {managedPools.length === 0 ? (
            <p className="text-sm text-[var(--id-text-muted)]">No live pools yet.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {managedPools.map((pool) => (
                <MarketplacePoolCardView key={pool.id} pool={pool} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "opportunities" && (
        <div>
          <p className="mb-4 text-sm text-[var(--id-text-muted)]">
            Legacy pool opportunities managed by {profile.publicDisplayName}.
          </p>
          {managedPools.length === 0 ? (
            <p className="text-sm text-[var(--id-text-muted)]">
              No live opportunities listed for this manager yet.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {managedPools.map((pool) => (
                <MarketplacePoolCardView key={pool.id} pool={pool} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "journal" && (
        <div>
          <p className="mb-4 text-sm text-[var(--id-text-muted)]">
            Public trading journal entries from this manager&apos;s listed opportunities.
          </p>
          {journalEntries.length === 0 ? (
            <p className="text-sm text-[var(--id-text-muted)]">No published journal entries yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-[var(--id-surface-muted)] text-left text-xs uppercase tracking-wide text-[var(--id-text-muted)]">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Asset</th>
                    <th className="px-4 py-3">Direction</th>
                    <th className="px-4 py-3">Result</th>
                    <th className="px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {journalEntries.map((entry) => (
                    <tr key={entry.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-[var(--id-text-secondary)]">
                        {entry.date
                          ? new Date(entry.date).toLocaleDateString("en-GB")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--id-text)]">{entry.asset}</td>
                      <td className="px-4 py-3 capitalize text-[var(--id-text-secondary)]">
                        {entry.direction}
                      </td>
                      <td className="px-4 py-3">
                        {entry.roiPct != null ? formatPercentage(entry.roiPct) : "—"}
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-[var(--id-text-muted)]">
                        {entry.notes ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "reviews" && (
        <div className="rounded-[var(--id-radius)] border border-dashed border-[var(--id-border)] p-8 text-center text-sm text-[var(--id-text-muted)]">
          Investor reviews and testimonials for this manager will be available in a future release.
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-6 shadow-[var(--id-shadow)]">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--id-text)]">
        {Icon && <Icon className="h-5 w-5 text-[var(--id-text-muted)]" />}
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
