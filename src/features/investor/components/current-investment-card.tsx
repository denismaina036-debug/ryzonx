import Link from "next/link";
import { BadgeCheck, Star } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  DashboardBadge,
  DashboardCard,
  dashboardCardBodyClass,
  dashboardLabelClass,
} from "@/features/investor/components/dashboard-card";
import { PoolProfitActions } from "@/features/investor/components/pool-profit-actions";
import { ROUTES } from "@/constants/routes";
import type { InvestorInvestmentSummary, InvestorPoolPerformance } from "@/features/investor/types";

interface CurrentInvestmentCardProps {
  performance: InvestorPoolPerformance;
  investment: InvestorInvestmentSummary;
}

const healthLabels = {
  healthy: "Healthy",
  watch: "Watch",
  at_risk: "At Risk",
} as const;

export function CurrentInvestmentCard({
  performance,
  investment,
}: CurrentInvestmentCardProps) {
  const primary = investment.participations[0];
  const hasPool = Boolean(primary);
  const poolName = hasPool
    ? (performance.poolName ?? primary?.poolName ?? "Active Pool")
    : "No active pool";
  const myInvestment =
    performance.myInvestment ??
    investment.participations.reduce((s, p) => s + p.amountInvested, 0);
  const health = performance.poolHealth;
  const managerName = performance.managerName;

  return (
    <DashboardCard
      title="Current Pool"
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
          {poolName}
        </p>

        {!hasPool ? (
          <p className="mt-4 text-sm text-[var(--id-text-muted)]">
            Join a pool from the Marketplace to see pool value, share, and manager details.
          </p>
        ) : (
          <>
            <div className="mt-5">
              <p className={dashboardLabelClass}>Pool Value</p>
              <p className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-[var(--id-text)]">
                {formatCurrency(performance.totalPoolBalance)}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <p className={dashboardLabelClass}>My Share</p>
                <p className="mt-1.5 font-mono text-sm font-semibold tabular-nums text-[var(--id-text)]">
                  {performance.clientSharePct.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className={dashboardLabelClass}>My Investment</p>
                <p className="mt-1.5 font-mono text-sm font-semibold tabular-nums text-[var(--id-text)]">
                  {formatCurrency(myInvestment)}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <PoolProfitActions
                fundId={primary!.fundId}
                poolName={poolName}
                availableProfit={primary!.poolProfit}
              />
            </div>

            {(primary?.investmentStartDate || primary?.termEndDate) && (
              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[var(--id-border)] pt-5">
                <div>
                  <p className={dashboardLabelClass}>Invested Since</p>
                  <p className="mt-1.5 text-sm font-medium text-[var(--id-text)]">
                    {primary?.investmentStartDate
                      ? new Date(primary.investmentStartDate).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className={dashboardLabelClass}>Matures On</p>
                  <p className="mt-1.5 text-sm font-medium text-[var(--id-text)]">
                    {primary?.termEndDate
                      ? new Date(primary.termEndDate).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </p>
                </div>
              </div>
            )}

            {managerName && (
              <div className="mt-6 flex items-center gap-3 border-t border-[var(--id-border)] pt-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-sm font-semibold text-white">
                  {managerName.charAt(0)}
                </div>
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
