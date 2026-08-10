import Link from "next/link";
import { requireAuth } from "@/lib/auth/session";
import { investorService } from "@/services/investor.service";
import { WalletHeroCard } from "@/features/investor/components/wallet-hero-card";
import { CurrentInvestmentCard } from "@/features/investor/components/current-investment-card";
import { InvestorPageContent } from "@/components/layouts/investor-page-content";
import {
  investorPageSubtitleClass,
  investorPageTitleClass,
} from "@/features/investor/constants/ui";
import { PoolProfitActions } from "@/features/investor/components/pool-profit-actions";
import { PoolPostCycleChoicesFromView } from "@/features/investor/components/pool-post-cycle-choices";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { formatCurrency } from "@/lib/utils";

export default async function MyInvestmentsPage() {
  await requireAuth();
  const { dashboard, poolViews } = await investorService.getInvestmentsPageData();
  const primaryPoolView = poolViews[0] ?? null;

  return (
    <InvestorPageContent className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={investorPageTitleClass}>My Investments</h1>
          <p className={investorPageSubtitleClass}>
            Your active pool participations and portfolio overview.
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          className="rounded-xl"
        >
          <Link href={ROUTES.portfolio}>Pool Cycles</Link>
        </Button>
        <Button
          asChild
          className="rounded-xl text-white [background:var(--id-accent-gradient)] hover:opacity-95"
        >
          <Link href={ROUTES.marketplace}>Invest in a Pool</Link>
        </Button>
      </header>

      <WalletHeroCard investment={dashboard.investment} />
      <CurrentInvestmentCard
        performance={dashboard.poolPerformance}
        investment={dashboard.investment}
        primaryPoolView={primaryPoolView}
      />

      {poolViews.length > 0 && (
        <section className="overflow-hidden rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-[var(--id-shadow)]">
          <div className="border-b border-[var(--id-border)] px-5 py-4 sm:px-6">
            <h2 className="text-sm font-semibold text-[var(--id-text)]">Active Pools</h2>
          </div>
          <ul className="divide-y divide-[var(--id-border)]">
            {poolViews.map((pool) => (
              <li key={pool.fundId} className="space-y-4 px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-[var(--id-text)]">{pool.poolName}</p>
                    <p className="mt-1 text-xs text-[var(--id-text-muted)]">
                      {pool.showPostCycleChoices
                        ? "Cycle completed — choose your next step"
                        : pool.hasActiveTradingCycle
                          ? "Trading cycle active"
                          : pool.payoutDurationLabel && pool.payoutDurationLabel !== "—"
                            ? pool.payoutDurationLabel
                            : "Investment active"}
                    </p>
                  </div>
                  <div className="flex gap-6 text-left sm:text-right">
                    <div>
                      <p className="font-mono text-sm font-semibold tabular-nums text-[var(--id-text)]">
                        {formatCurrency(pool.displayCapitalInvested)}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--id-text-muted)]">
                        {pool.showPostCycleChoices ? "Capital after cycle" : "Capital invested"}
                      </p>
                    </div>
                    {!pool.showPostCycleChoices && (
                      <div>
                        <p
                          className={`font-mono text-sm font-semibold tabular-nums ${
                            pool.poolProfit >= 0
                              ? "text-[var(--id-success)]"
                              : "text-[var(--id-danger)]"
                          }`}
                        >
                          {pool.poolProfit > 0 ? "+" : ""}
                          {formatCurrency(pool.poolProfit)}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--id-text-muted)]">Pool profit</p>
                      </div>
                    )}
                  </div>
                </div>

                {pool.showPostCycleChoices ? (
                  <PoolPostCycleChoicesFromView pool={pool} compact />
                ) : pool.hasActiveTradingCycle ? (
                  <PoolProfitActions
                    fundId={pool.fundId}
                    poolName={pool.poolName}
                    availableProfit={pool.poolProfit}
                    compact
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}
    </InvestorPageContent>
  );
}
