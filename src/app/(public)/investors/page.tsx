import type { Metadata } from "next";
import { Users, Wallet, Crown, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layouts/page-header";
import { SectionContainer } from "@/components/layouts/section";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { ActivityFeed } from "@/components/ui/activity-feed";
import { fundService } from "@/services/fund.service";
import { formatCurrency, formatPercentage } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Investors",
  description: "Transparent, anonymized fund-wide investor statistics for Ryvonx Main Pool.",
};

export default async function InvestorsPage() {
  const [stats, deposits, withdrawals, investors] = await Promise.all([
    fundService.getInvestorStats(),
    fundService.getRecentDeposits(undefined, 8),
    fundService.getRecentWithdrawals(undefined, 8),
    fundService.getRecentInvestors(undefined, 8),
  ]);

  return (
    <>
      <SectionContainer className="!pb-8 !pt-8">
        <PageHeader
          title="Investor Transparency"
          description="Fund-wide statistics and activity. All investor information is anonymized to protect privacy."
        />
        <StatGrid columns={4}>
          <StatCard
            label="Active Investors"
            value={String(stats.totalActiveInvestors)}
            icon={Users}
          />
          <StatCard
            label="Total Capital"
            value={formatCurrency(stats.totalCapitalInvested)}
            icon={Wallet}
          />
          <StatCard
            label="Average Investment"
            value={formatCurrency(stats.averageInvestment)}
            icon={TrendingUp}
          />
          <StatCard
            label="Largest Investment"
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
              Recent Investors
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
