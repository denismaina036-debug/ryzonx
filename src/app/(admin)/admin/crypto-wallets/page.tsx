import { AdminPageHeader, CryptoWalletsTable } from "@/features/admin/components";
import { depositService } from "@/services/deposit.service";

export default async function AdminCryptoWalletsPage() {
  const wallets = await depositService.getAdminCryptoWallets();

  return (
    <div>
      <AdminPageHeader
        title="Crypto Deposit Wallets"
        description="Manage wallet addresses and minimum deposits for each coin and network. Investors see active wallets on the deposit page."
      />
      <CryptoWalletsTable wallets={wallets} />
    </div>
  );
}
