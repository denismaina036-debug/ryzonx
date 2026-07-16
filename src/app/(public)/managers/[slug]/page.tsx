import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Award,
  BadgeCheck,
  Calendar,
  Globe,
  Landmark,
  MapPin,
  Shield,
  Star,
  TrendingUp,
} from "lucide-react";
import { InvestorPageContent } from "@/components/layouts/investor-page-content";
import { MANAGER_LEVEL_LABELS } from "@/constants/capital-allocation";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { MarketplacePoolCardView } from "@/features/marketplace/components/marketplace-pool-card";
import { poolManagerDashboardService } from "@/services/pool-manager-dashboard.service";
import { marketplaceService } from "@/services/marketplace.service";
import { formatCurrency, formatPercentage } from "@/lib/utils";

export default async function ManagerPublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await poolManagerDashboardService.getPublicProfile(slug);
  if (!profile) notFound();

  const managedPools = await marketplaceService.getManagerPools(slug);

  const stats = [
    {
      label: "Win Rate",
      value:
        profile.winRatePct != null ? formatPercentage(profile.winRatePct) : "—",
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
        profile.maxDrawdownPct != null
          ? formatPercentage(profile.maxDrawdownPct)
          : "—",
    },
    { label: "AUM", value: formatCurrency(profile.assetsUnderManagement) },
    { label: "Active Investors", value: String(profile.activeInvestors) },
    { label: "Pools Managed", value: String(profile.poolsManaged) },
  ];

  const ratings = [
    { label: "RyvonX Rating", value: profile.ryvonxRating, max: 5 },
    { label: "Security", value: profile.securityRating, max: 5 },
    { label: "Aggressiveness", value: profile.aggressivenessRating, max: 5 },
  ].filter((r) => r.value != null);

  return (
    <InvestorPageContent wide>
      <div className="space-y-8 pb-8">
        <Link
          href={ROUTES.marketplace}
          className="inline-flex text-sm text-[var(--id-text-muted)] transition-colors hover:text-[var(--id-text)]"
        >
          ← Back to Marketplace / Pools
        </Link>

        {/* Cover + identity */}
        <section className="overflow-hidden rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-[var(--id-shadow)]">
          <div className="relative h-40 sm:h-52">
            {profile.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.coverImageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full bg-gradient-to-br from-indigo-900/40 via-[var(--id-surface-elevated)] to-[var(--id-bg)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--id-surface)] via-transparent to-transparent" />
          </div>

          <div className="relative px-6 pb-6 sm:px-8">
            <div className="-mt-12 flex flex-col gap-5 sm:flex-row sm:items-end">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-[var(--id-surface)] bg-[var(--id-surface-muted)] shadow-lg">
                {profile.profilePhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.profilePhotoUrl}
                    alt={profile.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-3xl font-bold text-[var(--id-accent-text)]">
                    {profile.displayName.charAt(0)}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold text-[var(--id-text)] sm:text-3xl">
                    {profile.displayName}
                  </h1>
                  {profile.isVerified && (
                    <BadgeCheck
                      className="h-6 w-6 text-[var(--id-accent)]"
                      aria-label="Verified manager"
                    />
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--id-text-secondary)]">
                  {profile.managerLevel && (
                    <span className="rounded-full bg-[var(--id-accent-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--id-accent-text)]">
                      {MANAGER_LEVEL_LABELS[profile.managerLevel] ??
                        profile.managerLevel}
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

              <Button
                asChild
                className="shrink-0 rounded-xl bg-[var(--id-accent)] text-white hover:opacity-90"
              >
                <Link href={ROUTES.marketplace}>
                  <Landmark className="mr-2 h-4 w-4" />
                  View Pools
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Performance stats */}
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

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content */}
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-6 shadow-[var(--id-shadow)]">
              <h2 className="text-lg font-semibold text-[var(--id-text)]">Biography</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--id-text-secondary)]">
                {profile.biography?.trim() || "No biography provided yet."}
              </p>
            </section>

            {profile.markets.length > 0 && (
              <section className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-6 shadow-[var(--id-shadow)]">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--id-text)]">
                  <Globe className="h-5 w-5 text-[var(--id-text-muted)]" />
                  Markets Traded
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {profile.markets.map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-[var(--id-surface-muted)] px-3 py-1 text-xs font-medium text-[var(--id-text-secondary)]"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {profile.achievements.length > 0 && (
              <section className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-6 shadow-[var(--id-shadow)]">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--id-text)]">
                  <Award className="h-5 w-5 text-amber-400" />
                  Achievements
                </h2>
                <ul className="mt-4 space-y-3">
                  {profile.achievements.map((a) => (
                    <li
                      key={a.title + a.awardedAt}
                      className="flex items-center justify-between gap-4 rounded-xl bg-[var(--id-surface-muted)] px-4 py-3"
                    >
                      <span className="text-sm font-medium text-[var(--id-text)]">
                        {a.title}
                      </span>
                      <span className="text-xs text-[var(--id-text-muted)]">
                        {new Date(a.awardedAt).toLocaleDateString("en-GB", {
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-6 shadow-[var(--id-shadow)]">
              <h2 className="text-lg font-semibold text-[var(--id-text)]">
                Managed Pools ({managedPools.length})
              </h2>
              {managedPools.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--id-text-muted)]">
                  No live pools listed for this manager yet.
                </p>
              ) : (
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  {managedPools.map((pool) => (
                    <MarketplacePoolCardView key={pool.id} pool={pool} />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="rounded-[var(--id-radius)] border border-[var(--id-accent)]/20 bg-[var(--id-accent-soft)] p-6">
              <Shield className="h-8 w-8 text-[var(--id-accent-text)]" />
              <h3 className="mt-3 font-semibold text-[var(--id-text)]">
                RyvonX Verified Manager
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--id-text-secondary)]">
                Approved Pool Manager under RyvonX administration.
                {profile.approvedAt &&
                  ` Verified ${new Date(profile.approvedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}.`}
              </p>

              {ratings.length > 0 && (
                <dl className="mt-5 space-y-3">
                  {ratings.map((r) => (
                    <div key={r.label}>
                      <div className="flex items-center justify-between text-sm">
                        <dt className="text-[var(--id-text-muted)]">{r.label}</dt>
                        <dd className="inline-flex items-center gap-1 font-medium text-[var(--id-text)]">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {r.value!.toFixed(1)}/{r.max}
                        </dd>
                      </div>
                    </div>
                  ))}
                </dl>
              )}
            </div>

            <div className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-5 shadow-[var(--id-shadow)]">
              <p className="text-xs uppercase tracking-wider text-[var(--id-text-muted)]">
                At a glance
              </p>
              <ul className="mt-3 space-y-2 text-sm text-[var(--id-text-secondary)]">
                <li>{profile.poolsManaged} active pool(s)</li>
                <li>{profile.activeInvestors} investor(s)</li>
                <li>{formatCurrency(profile.assetsUnderManagement)} AUM</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </InvestorPageContent>
  );
}
