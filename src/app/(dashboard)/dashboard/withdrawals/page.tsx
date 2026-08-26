import { requireAuth } from "@/lib/auth/session";
import { InvestorWithdrawalsView } from "@/features/investor/components/investor-withdrawals-view";
import { walletProjectionService } from "@/services/wallet-projection.service";
import { depositService } from "@/services/deposit.service";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function WithdrawalsPage() {
  const user = await requireAuth();
  const projection = await walletProjectionService.getForInvestor(user.id);

  const [depositData, latest] = await Promise.all([depositService.getCryptoDepositPageData(), createAdminClient().from("transactions").select("destination, crypto_symbol, crypto_network").eq("user_id", user.id).eq("type", "deposit").eq("status", "completed").order("created_at", { ascending: false }).limit(1).maybeSingle()]);
  return <InvestorWithdrawalsView availableBalance={projection.available} assets={depositData.assets} defaultDestination={latest.data?.destination ?? ""} defaultSymbol={latest.data?.crypto_symbol ?? ""} defaultNetwork={latest.data?.crypto_network ?? ""} />;
}
