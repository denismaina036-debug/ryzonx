import { copyTradingText } from "@/lib/copy-trading-presentation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/session";
import { investorService } from "@/services/investor.service";
import { WalletHeroCard } from "@/features/investor/components/wallet-hero-card";
import { InvestorPageContent } from "@/components/layouts/investor-page-content";
import {
  investorPageSubtitleClass,
  investorPageTitleClass,
} from "@/features/investor/constants/ui";
import { PoolPostCycleChoicesFromView } from "@/features/investor/components/pool-post-cycle-choices";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { formatCurrency } from "@/lib/utils";
import { formatCycleProfitSplit } from "@/domain/investment/profit-split";
import { UserAvatar } from "@/components/ui/user-avatar";
import { BadgeCheck } from "lucide-react";

export default async function MyInvestmentsPage() {
  await requireAuth();
  const { dashboard, poolViews } = await investorService.getInvestmentsPageData();

  return (
    <InvestorPageContent className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={investorPageTitleClass}>My Copied Traders</h1>
          <p className={investorPageSubtitleClass}>
            Review each trader, copying balance, and profit split independently.
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

      {poolViews.length > 0 && (
        <section className="overflow-hidden rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-[var(--id-shadow)]">
          <div className="border-b border-[var(--id-border)] px-5 py-4 sm:px-6">
            <h2 className="text-sm font-semibold text-[var(--id-text)]">Copied Traders</h2>
            <p className="mt-1 text-xs text-[var(--id-text-muted)]">
              Each trader and copying balance is shown separately.
            </p>
          </div>
          <ul className="divide-y divide-[var(--id-border)]">
            {poolViews.map((pool) => (
              <li key={pool.fundId} className="space-y-4 px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar
                      name={pool.traderName}
                      avatarUrl={pool.traderPhotoUrl}
                      className="h-11 w-11 rounded-full"
                    />
                    <div className="min-w-0">
                      <p className="inline-flex items-center gap-1.5 font-semibold text-[var(--id-text)]">
                        {pool.traderName}
                        <BadgeCheck className="h-4 w-4 shrink-0 text-[var(--id-accent)]" />
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[var(--id-text-muted)]">
                        {copyTradingText(pool.poolName)}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:text-right">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">
                        Copying capital
                      </p>
                      <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-[var(--id-text)]">
                        {formatCurrency(pool.displayCapitalInvested)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">
                        {pool.profitSplitTierName
                          ? `${pool.profitSplitTierName} profit split`
                          : "Profit split"}
                      </p>
                      <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-[var(--id-text)]">
                        {formatCycleProfitSplit(pool.profitSplit)}
                      </p>
                    </div>
                  </div>
                </div>

                <PoolPostCycleChoicesFromView pool={pool} compact />
              </li>
            ))}
          </ul>
        </section>
      )}
    </InvestorPageContent>
  );
}
