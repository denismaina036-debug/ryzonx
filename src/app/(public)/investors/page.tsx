import type { Metadata } from "next";
import { Users, Wallet, Crown, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layouts/page-header";
import { SectionContainer } from "@/components/layouts/section";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { ActivityFeed } from "@/components/ui/activity-feed";
import { ROUTES } from "@/constants/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { fundService } from "@/services/fund.service";
import { landingPageStatsService } from "@/services/landing-page-stats.service";
import { formatCurrency, formatPercentage } from "@/lib/utils";

export const metadata: Metadata = buildPageMetadata({
  title: "Copiers",
  description:
    "Transparent, anonymized fund-wide copier statistics and activity on RyvonX.",
  path: ROUTES.investors,
  keywords: ["copier statistics", "fund transparency", "RyvonX copiers"],
});

export default async function InvestorsPage() {
  const [stats, deposits, withdrawals, investors, investorCount] = await Promise.all([
    fundService.getInvestorStats(),
    fundService.getRecentDeposits(undefined, 8),
    fundService.getRecentWithdrawals(undefined, 8),
    fundService.getRecentInvestors(undefined, 8),
    landingPageStatsService.resolveAutomaticNumericValue("total_investors"),
  ]);

  return (
    <>
      <SectionContainer className="!pb-8 !pt-8">
        <PageHeader
          title="Copier Transparency"
          description="Fund-wide statistics and activity. All copier information is anonymized to protect privacy."
        />
        <StatGrid columns={4}>
          <StatCard
            label="Active Copiers"
            value={investorCount == null ? "—" : new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(investorCount)}
            icon={Users}
          />
          <StatCard
            label="Total Capital"
            value={formatCurrency(stats.totalCapitalInvested)}
            icon={Wallet}
          />
          <StatCard
            label="Average Copy Allocation"
            value={formatCurrency(stats.averageInvestment)}
            icon={TrendingUp}
          />
          <StatCard
            label="Largest Copy Allocation"
            value={formatCurrency(stats.largestInvestment)}
            icon={Crown}
          />
        </StatGrid>
      </SectionContainer>

      <SectionContainer className="bg-surface-1 !pt-0">
        <StatGrid columns={3}>
          <StatCard
            label="Average ROI"
            value={formatPercentage(stats.averageRoi)}
            changeType="positive"
          />
          <StatCard
            label="Total Deposits"
            value={formatCurrency(stats.totalDeposits)}
          />
          <StatCard
            label="Total Withdrawals"
            value={formatCurrency(stats.totalWithdrawals)}
          />
        </StatGrid>
      </SectionContainer>

      <SectionContainer>
        <div className="grid gap-8 lg:grid-cols-3">
          <div>
            <h3 className="mb-4 text-lg font-semibold text-navy-950">
              Recent Copiers
            </h3>
            <ActivityFeed items={investors} type="investor" />
          </div>
          <div>
            <h3 className="mb-4 text-lg font-semibold text-navy-950">
              Recent Deposits
            </h3>
            <ActivityFeed items={deposits} type="deposit" />
          </div>
          <div>
            <h3 className="mb-4 text-lg font-semibold text-navy-950">
              Recent Withdrawals
            </h3>
            <ActivityFeed items={withdrawals} type="withdrawal" />
          </div>
        </div>
      </SectionContainer>
    </>
  );
}
