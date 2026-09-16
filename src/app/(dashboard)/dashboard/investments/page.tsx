import { copyTradingText } from "@/lib/copy-trading-presentation";
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
          <h1 className={investorPageTitleClass}>My Copy Allocations</h1>
          <p className={investorPageSubtitleClass}>
            Your active strategy participations and portfolio overview.
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          className="rounded-xl"
        >
          <Link href={ROUTES.portfolio}>Copy Activity</Link>
        </Button>
        <Button
          asChild
          className="rounded-xl text-white [background:var(--id-accent-gradient)] hover:opacity-95"
        >
          <Link href={ROUTES.marketplace}>Copy trader</Link>
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
            <h2 className="text-sm font-semibold text-[var(--id-text)]">Active Strategys</h2>
          </div>
          <ul className="divide-y divide-[var(--id-border)]">
            {poolViews.map((pool) => (
              <li key={pool.fundId} className="space-y-4 px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-[var(--id-text)]">{copyTradingText(pool.poolName)}</p>
                    <p className="mt-1 text-xs text-[var(--id-text-muted)]">
                      {pool.hasActiveTradingCycle
                        ? "Copy trading active"
                        : pool.showPostCycleChoices
                          ? "Copy period completed"
                          : pool.payoutDurationLabel && pool.payoutDurationLabel !== "—"
                            ? pool.payoutDurationLabel
                            : "Copy Allocation active"}
                    </p>
                  </div>
                  {!pool.showPostCycleChoices && (
                    <div className="text-left sm:text-right">
                      <p className="font-mono text-sm font-semibold tabular-nums text-[var(--id-text)]">
                        {formatCurrency(pool.currentValue)}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--id-text-muted)]">Copying balance</p>
                    </div>
                  )}
                </div>

                {pool.showPostCycleChoices ? (
                  <PoolPostCycleChoicesFromView pool={pool} compact />
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}
    </InvestorPageContent>
  );
}
