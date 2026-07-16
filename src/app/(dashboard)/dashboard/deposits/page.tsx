import { depositService } from "@/services/deposit.service";
import { CryptoDepositView } from "@/features/investor";

export default async function DepositsPage() {
  const data = await depositService.getCryptoDepositPageData();
  return <CryptoDepositView data={data} />;
}
