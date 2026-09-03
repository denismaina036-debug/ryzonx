import { CryptoWalletsTable } from "@/features/admin/components";
import { AdminFinanceShell } from "@/features/admin/components/admin-finance-shell";
import { depositService } from "@/services/deposit.service";
import { platformSettingsService } from "@/services/platform-settings.service";
import { CryptoMinimumDepositCard } from "@/features/admin/components/crypto-minimum-deposit-card";

export default async function AdminFinanceWalletsPage() {
  const [wallets, cryptoMinimum] = await Promise.all([
    depositService.getAdminCryptoWallets(),
    platformSettingsService.getDepositMinimum("crypto"),
  ]);

  return (
    <AdminFinanceShell
      title="Crypto Wallets"
      description="Manage wallet addresses and minimum deposits for each coin and network. Investors see active wallets on the deposit page."
    >
      <div className="space-y-6">
        <CryptoMinimumDepositCard initialMinimum={cryptoMinimum} />
        <CryptoWalletsTable wallets={wallets} />
      </div>
    </AdminFinanceShell>
  );
}
