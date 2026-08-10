import { requireAuth } from "@/lib/auth/session";
import { InvestorWithdrawalsView } from "@/features/investor/components/investor-withdrawals-view";
import { walletProjectionService } from "@/services/wallet-projection.service";

export default async function WithdrawalsPage() {
  const user = await requireAuth();
  const projection = await walletProjectionService.getForInvestor(user.id);

  return <InvestorWithdrawalsView availableBalance={projection.available} />;
}
