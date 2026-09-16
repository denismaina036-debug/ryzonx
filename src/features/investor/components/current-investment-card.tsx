import { copyTradingText } from "@/lib/copy-trading-presentation";
import Link from "next/link";
import { BadgeCheck, Star } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatCurrency } from "@/lib/utils";
import {
  DashboardBadge,
  DashboardCard,
  dashboardCardBodyClass,
  dashboardLabelClass,
} from "@/features/investor/components/dashboard-card";
import { ROUTES } from "@/constants/routes";
import type { InvestorInvestmentSummary, InvestorPoolPerformance } from "@/features/investor/types";
import type { InvestorPoolParticipationView } from "@/domain/investment/investor-pool-participation";
import { PoolPostCycleChoicesFromView } from "@/features/investor/components/pool-post-cycle-choices";
import { formatCycleProfitSplit } from "@/domain/investment/profit-split";

interface CurrentInvestmentCardProps {
  performance: InvestorPoolPerformance;
  investment: InvestorInvestmentSummary;
  primaryPoolView?: InvestorPoolParticipationView | null;
}

const healthLabels = {
  healthy: "Healthy",
  watch: "Watch",
  at_risk: "At Risk",
} as const;

export function CurrentInvestmentCard({
  performance,
  investment,
  primaryPoolView = null,
}: CurrentInvestmentCardProps) {
  const primary = investment.participations[0];
  const hasPool = Boolean(primary);
  const poolName = hasPool
    ? (performance.poolName ?? primary?.poolName ?? "Active strategy")
    : "No active strategy";
  const myInvestment =
    primaryPoolView?.displayCapitalInvested ??
    performance.myInvestment ??
    primary?.amountInvested ??
    0;
  const copyingBalance =
    primaryPoolView?.currentValue ?? primary?.currentValue ?? myInvestment;
  const health = performance.poolHealth;
  const managerName = performance.managerName;
  const managerPhotoUrl = performance.managerPhotoUrl;

  return (
    <DashboardCard
      title="Current Strategy"
      headerExtra={
        hasPool && health ? (
          <DashboardBadge
            tone={health === "healthy" ? "success" : health === "watch" ? "accent" : "neutral"}
          >
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current" />
            {healthLabels[health]}
          </DashboardBadge>
        ) : (
          <DashboardBadge tone="neutral">None</DashboardBadge>
        )
      }
    >
      <div className={dashboardCardBodyClass}>
        <p className="text-lg font-semibold tracking-tight text-[var(--id-text)]">
          {managerName || copyTradingText(poolName)}
        </p>

        {!hasPool ? (
          <p className="mt-4 text-sm text-[var(--id-text-muted)]">
            Copy a trader from the Marketplace to see strategy value, profit split, and trader details.
          </p>
        ) : (
          <>
            <div className="mt-5">
              <p className={dashboardLabelClass}>Traded capital</p>
              <p className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-[var(--id-text)]">
                {formatCurrency(performance.displayedTradedCapital)}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <p className={dashboardLabelClass}>
                  {performance.profitSplitTierName
                    ? `${performance.profitSplitTierName} Profit Split`
                    : "Profit Split"}
                </p>
                <p className="mt-1.5 font-mono text-sm font-semibold tabular-nums text-[var(--id-text)]">
                  {formatCycleProfitSplit(performance.profitSplit)}
                </p>
              </div>
              <div>
                <p className={dashboardLabelClass}>Copying Balance</p>
                <p className="mt-1.5 font-mono text-sm font-semibold tabular-nums text-[var(--id-text)]">
                  {formatCurrency(copyingBalance)}
                </p>
              </div>
            </div>

            <div className="mt-6">
              {primaryPoolView?.showPostCycleChoices ? (
                <PoolPostCycleChoicesFromView pool={primaryPoolView} />
              ) : null}
            </div>

            {managerName && (
              <div className="mt-6 flex items-center gap-3 border-t border-[var(--id-border)] pt-5">
                <UserAvatar
                  name={managerName}
                  avatarUrl={managerPhotoUrl}
                  className="h-10 w-10 rounded-full"
                  fallbackClassName="text-sm"
                />
                <div className="min-w-0 flex-1">
                  <Link
                    href={ROUTES.marketplace}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--id-text)] transition-colors hover:text-[var(--id-accent-text)]"
                  >
                    {managerName}
                    <BadgeCheck
                      className="h-4 w-4 text-[var(--id-accent)]"
                      strokeWidth={1.75}
                    />
                  </Link>
                  {performance.managerRating != null && (
                    <p className="mt-0.5 inline-flex items-center gap-0.5 text-xs text-[var(--id-text-muted)]">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {performance.managerRating.toFixed(1)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardCard>
  );
}
