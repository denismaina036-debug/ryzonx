import { Users, Wallet, TrendingUp, ArrowDownToLine, ArrowUpFromLine, Crown } from "lucide-react";
import { SectionContainer, SectionHeader } from "@/components/layouts/section";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { fundService } from "@/services/fund.service";
import { formatCurrency, formatPercentage } from "@/lib/utils";

export async function InvestorStatsSection() {
  const stats = await fundService.getInvestorStats();

  return (
    <SectionContainer>
      <SectionHeader
        badge="Investors"
        title="Fund Statistics"
        description="Anonymized aggregate data about our investor community."
        align="center"
      />
      <StatGrid columns={3}>
        <StatCard
          label="Total Investors"
          value={String(stats.totalActiveInvestors)}
          icon={Users}
        />
        <StatCard
          label="Average Investment"
          value={formatCurrency(stats.averageInvestment)}
          icon={Wallet}
        />
        <StatCard
          label="Largest Investment"
          value={formatCurrency(stats.largestInvestment)}
          icon={Crown}
        />
        <StatCard
          label="Average ROI"
          value={formatPercentage(stats.averageRoi)}
          changeType="positive"
          icon={TrendingUp}
        />
        <StatCard
          label="Total Deposits"
          value={formatCurrency(stats.totalDeposits)}
          icon={ArrowDownToLine}
        />
        <StatCard
          label="Total Withdrawals"
          value={formatCurrency(stats.totalWithdrawals)}
          icon={ArrowUpFromLine}
        />
      </StatGrid>
    </SectionContainer>
  );
}
