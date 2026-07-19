import { CryptoWalletsTable } from "@/features/admin/components";
import { AdminFinanceShell } from "@/features/admin/components/admin-finance-shell";
import { depositService } from "@/services/deposit.service";

export default async function AdminFinanceWalletsPage() {
  const wallets = await depositService.getAdminCryptoWallets();

  return (
    <AdminFinanceShell
      title="Crypto Wallets"
      description="Manage wallet addresses and minimum deposits for each coin and network. Investors see active wallets on the deposit page."
    >
      <CryptoWalletsTable wallets={wallets} />
    </AdminFinanceShell>
  );
}
