import { adminService } from "@/services/admin.service";
import { depositService } from "@/services/deposit.service";
import { AdminFinanceOverview } from "@/features/admin/components/admin-finance-overview";

export default async function AdminFinancePage() {
  const [stats, wallets] = await Promise.all([
    adminService.getDashboardStats(),
    depositService.getAdminCryptoWallets(),
  ]);

  const activeWallets = wallets.filter((w) => w.is_active).length;

  return (
    <AdminFinanceOverview
      pendingDeposits={stats.pendingDeposits}
      pendingWithdrawals={stats.pendingWithdrawals}
      totalDeposits={stats.totalDeposits}
      totalWithdrawals={stats.totalWithdrawals}
      activeWallets={activeWallets}
    />
  );
}
