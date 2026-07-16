import {
  TrendingUp,
  Users,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Wallet,
  Target,
  Activity,
} from "lucide-react";
import {
  AdminMetricCard,
  AdminMetricGrid,
  AdminPageHeader,
  AdminDashboardCharts,
  AdminQuickActions,
} from "@/features/admin/components";
import { adminService } from "@/services/admin.service";
import { formatCurrency, formatPercentage } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const [
    stats,
    poolGrowth,
    deposits,
    withdrawals,
    investments,
    dailyRoi,
  ] = await Promise.all([
    adminService.getDashboardStats(),
    adminService.getPoolGrowthTrend(),
    adminService.getDepositTrend(),
    adminService.getWithdrawalTrend(),
    adminService.getInvestmentTrend(),
    adminService.getDailyRoiTrend(),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Dashboard"
        description="Complete operational overview of Ryvonx. All public and investor data originates here."
      />

      <AdminMetricGrid columns={6}>
        <AdminMetricCard label="Total Pool Value" value={formatCurrency(stats.totalPoolValue)} icon={Wallet} />
        <AdminMetricCard label="Active Investors" value={String(stats.activeInvestors)} icon={Users} />
        <AdminMetricCard label="Pending Deposits" value={String(stats.pendingDeposits)} icon={ArrowDownToLine} changeType="neutral" change="Requires review" />
        <AdminMetricCard label="Pending Withdrawals" value={String(stats.pendingWithdrawals)} icon={ArrowUpFromLine} changeType="neutral" change="Requires review" />
        <AdminMetricCard label="Today's ROI" value={formatPercentage(stats.dailyRoi)} icon={BarChart3} changeType="positive" />
        <AdminMetricCard label="Monthly ROI" value={formatPercentage(stats.monthlyRoi)} icon={TrendingUp} changeType="positive" />
      </AdminMetricGrid>

      <AdminMetricGrid columns={6}>
        <AdminMetricCard label="Assets Under Management" value={formatCurrency(stats.assetsUnderManagement)} icon={Wallet} />
        <AdminMetricCard label="Total Deposits" value={formatCurrency(stats.totalDeposits)} icon={ArrowDownToLine} />
        <AdminMetricCard label="Total Withdrawals" value={formatCurrency(stats.totalWithdrawals)} icon={ArrowUpFromLine} />
        <AdminMetricCard label="Active Trades" value={String(stats.activeTrades)} icon={Activity} />
        <AdminMetricCard label="Closed Trades" value={String(stats.closedTrades)} icon={Target} />
        <AdminMetricCard label="Win Rate" value={`${stats.winRate}%`} icon={BarChart3} changeType="positive" />
      </AdminMetricGrid>

      <AdminQuickActions />

      <AdminDashboardCharts
        poolGrowth={poolGrowth}
        deposits={deposits}
        withdrawals={withdrawals}
        investments={investments}
        dailyRoi={dailyRoi}
      />
    </div>
  );
}
